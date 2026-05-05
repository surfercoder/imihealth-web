// One-off recovery for doctors whose MercadoPago payment was authorized but
// whose pending_signups row was never materialized (i.e. /billing/return was
// blocked by the proxy middleware before reconcile could run).
//
// For each (pending_signup_id, preapproval_id) pair, this script:
//   1. Fetches the preapproval from MP and asserts status === "authorized"
//   2. Re-runs the same logic as reconcile.ts:materializePendingSignup —
//      Supabase signUp() (which fires the confirmation email), update doctor
//      extras, upsert subscription with the MP linkage, delete the
//      pending_signups row.
//
// Usage:
//   node scripts/recover-stuck-signup.mjs <pending_signup_id> <preapproval_id> [<pending_signup_id> <preapproval_id>...]
//
// Requires the same env as the app: NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SECRET_KEY (service role), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
// MERCADOPAGO_ACCESS_TOKEN, NEXT_PUBLIC_APP_URL, SIGNUP_ENC_KEY.

import { createClient } from "@supabase/supabase-js";
import { createDecipheriv } from "node:crypto";

function envOrDie(key) {
  const v = process.env[key];
  if (!v) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
  return v;
}

const SUPABASE_URL = envOrDie("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_KEY = envOrDie("SUPABASE_SECRET_KEY");
const SUPABASE_ANON_KEY = envOrDie("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const MP_TOKEN = envOrDie("MERCADOPAGO_ACCESS_TOKEN");
const APP_URL = envOrDie("NEXT_PUBLIC_APP_URL");
const SIGNUP_KEY_HEX = envOrDie("SIGNUP_ENC_KEY");

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function decryptPassword(blob) {
  // Mirrors src/lib/signup-password-crypto.ts: AES-256-GCM, base64 layout
  // [12-byte iv][16-byte tag][ciphertext].
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const key = Buffer.from(SIGNUP_KEY_HEX, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return out.toString("utf8");
}

async function getPreapproval(id) {
  const res = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${MP_TOKEN}` } },
  );
  if (!res.ok) {
    throw new Error(`MP getPreapproval ${id} failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

function planTierFromAmount(p) {
  if (
    p.auto_recurring.frequency_type === "months" &&
    p.auto_recurring.frequency >= 12
  ) {
    return "pro_yearly";
  }
  return "pro_monthly";
}

async function recoverOne(pendingSignupId, preapprovalId) {
  console.log(`\n— recover ${pendingSignupId} ↔ ${preapprovalId}`);

  const preapproval = await getPreapproval(preapprovalId);
  if (preapproval.status !== "authorized") {
    console.warn(
      `  skip: preapproval status=${preapproval.status} (expected "authorized")`,
    );
    return;
  }

  const { data: pending, error: pendingErr } = await admin
    .from("pending_signups")
    .select("id, email, encrypted_password, signup_data")
    .eq("id", pendingSignupId)
    .maybeSingle();
  if (pendingErr) throw pendingErr;
  if (!pending) {
    console.warn("  skip: pending_signups row not found (already materialized?)");
    return;
  }

  const password = decryptPassword(pending.encrypted_password);
  const data = pending.signup_data;

  const { data: signUp, error: signErr } = await anon.auth.signUp({
    email: pending.email,
    password,
    options: {
      emailRedirectTo: `${APP_URL}/auth/confirm?next=${encodeURIComponent("/?welcome=true")}`,
      data: {
        name: data.name,
        dni: data.dni,
        matricula: data.matricula,
        phone: data.phone,
        especialidad: data.especialidad,
      },
    },
  });
  if (signErr || !signUp.user) {
    throw new Error(
      `signUp failed for ${pending.email}: ${signErr?.message ?? "no user"}`,
    );
  }
  const userId = signUp.user.id;
  console.log(`  ✓ auth user created: ${userId}`);

  const docUpdates = {};
  if (data.firmaDigital) docUpdates.firma_digital = data.firmaDigital;
  if (data.avatar) docUpdates.avatar = data.avatar;
  if (data.tagline) docUpdates.tagline = data.tagline;
  if (Object.keys(docUpdates).length > 0) {
    const { error } = await admin.from("doctors").update(docUpdates).eq("id", userId);
    if (error) throw error;
    console.log(`  ✓ doctor extras applied`);
  }

  const { error: subErr } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: planTierFromAmount(preapproval),
      status: "active",
      mp_preapproval_id: preapproval.id,
      mp_payer_id: preapproval.payer_id ? String(preapproval.payer_id) : null,
      current_period_end: preapproval.next_payment_date,
      cancelled_at: null,
    },
    { onConflict: "user_id" },
  );
  if (subErr) throw subErr;
  console.log(`  ✓ subscription set to active (${planTierFromAmount(preapproval)})`);

  const { error: delErr } = await admin
    .from("pending_signups")
    .delete()
    .eq("id", pending.id);
  if (delErr) throw delErr;
  console.log(`  ✓ pending_signups row removed`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args.length % 2 !== 0) {
    console.error(
      "Usage: node scripts/recover-stuck-signup.mjs <pending_signup_id> <preapproval_id> [...]",
    );
    process.exit(1);
  }
  for (let i = 0; i < args.length; i += 2) {
    await recoverOne(args[i], args[i + 1]);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
