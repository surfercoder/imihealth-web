// Reconciles a MercadoPago preapproval into our local DB.
//
// Used by two callers, both idempotent:
//   1. The MP webhook (subscription_preapproval events).
//   2. The /billing/return page server-side. The user just came back from
//      MP's hosted checkout, so we already know the preapproval id from
//      the redirect query params. Calling reconcile here means the user is
//      fully materialized by the time the page renders, even if the webhook
//      is delayed or never fires (signature mismatch, MP-side delivery
//      issue). The webhook then becomes a backup, not the primary path.
//
// Every update is derived from MP's authoritative state, so retries and
// out-of-order delivery are safe.
//
// IMPORTANT: do not import this from a "use client" module — it pulls
// service-role Supabase + the MP server SDK.

import { createClient as createAnonClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/utils/supabase/server";
import {
  getPreapproval,
  updatePreapprovalStatus,
  searchAuthorizedPaymentsByPreapproval,
  getPayment,
  type Preapproval,
  type PreapprovalStatus,
} from "@/lib/mercadopago/api";
import { decryptPassword } from "@/lib/signup-password-crypto";
import type { PlanTier, SubscriptionStatus } from "@/actions/subscriptions";

interface PendingSignupData {
  plan: PlanTier;
  name: string;
  dni: string | null;
  matricula: string;
  phone: string;
  especialidad: string;
  tagline: string | null;
  firmaDigital: string | null;
  avatar: string | null;
}

interface PendingSignupRow {
  id: string;
  email: string;
  encrypted_password: string;
  signup_data: PendingSignupData;
}

export type ReconcileResult =
  | { kind: "materialized"; userId: string; pendingSignupId: string }
  | { kind: "subscription-updated"; userId: string }
  | { kind: "pending-signup-waiting"; pendingSignupId: string }
  | { kind: "pending-signup-cancelled"; pendingSignupId: string }
  | { kind: "stale"; reason: string }
  | { kind: "no-ref" };

/**
 * Last-resort recovery for stuck signups: if /billing/return never ran (or
 * its cookie expired), the webhook arrives with no ref and no matching
 * subscription. We pull the payer email off the most recent authorized
 * payment and look it up in pending_signups (email is unique there). If the
 * doctor's MP-account email matches their signup email, the materialization
 * proceeds; otherwise we surface the mismatch in Sentry so it can be
 * recovered with scripts/recover-stuck-signup.mjs.
 */
async function findPendingSignupByPayerEmail(
  preapprovalId: string,
): Promise<PendingSignupRow | null> {
  let payments;
  try {
    payments = await searchAuthorizedPaymentsByPreapproval(preapprovalId);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { flow: "reconcile-payer-email-search" },
      extra: { preapprovalId },
    });
    return null;
  }
  // The most recent payment is what landed the user on /billing/return.
  const latest = [...payments]
    .filter((p) => p.payment?.id)
    .sort(
      (a, b) =>
        Date.parse(b.date_created || "") - Date.parse(a.date_created || ""),
    )[0];
  if (!latest?.payment?.id) return null;

  let payment;
  try {
    payment = await getPayment(latest.payment.id);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { flow: "reconcile-payer-email-fetch" },
      extra: { preapprovalId, paymentId: latest.payment.id },
    });
    return null;
  }
  const email = payment.payer?.email?.trim().toLowerCase();
  if (!email) return null;

  const admin = createServiceClient();
  const { data: pending } = await admin
    .from("pending_signups")
    .select("id, email, encrypted_password, signup_data")
    .ilike("email", email)
    .maybeSingle<PendingSignupRow>();
  if (!pending) {
    Sentry.captureMessage(
      "[reconcile] preapproval has no matching pending_signup by payer email",
      {
        level: "warning",
        tags: { flow: "reconcile-payer-email-miss" },
        extra: { preapprovalId, payerEmail: email },
      },
    );
    return null;
  }
  return pending;
}

export function mapPreapprovalStatus(
  status: PreapprovalStatus,
): SubscriptionStatus {
  switch (status) {
    case "authorized":
      return "active";
    case "cancelled":
      return "cancelled";
    case "paused":
      return "past_due";
    case "pending":
    default:
      return "pending";
  }
}

export function planTierFromAmount(p: Preapproval): PlanTier {
  if (
    p.auto_recurring.frequency_type === "months" &&
    p.auto_recurring.frequency >= 12
  ) {
    return "pro_yearly";
  }
  return "pro_monthly";
}

async function materializePendingSignup(
  pending: PendingSignupRow,
  preapproval: Preapproval,
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const password = decryptPassword(pending.encrypted_password);
  const data = pending.signup_data;

  // Use the anon client so signUp() triggers Supabase's confirmation email —
  // admin.createUser would create the user silently. Sign-up emails are only
  // sent after payment is authorized, so abandoned signups never get one.
  // Concurrent calls (webhook vs /billing/return) are safe: the email is
  // unique in auth.users, so the second signUp throws "already registered".
  // That bubbles up as a 500 (MP retries the webhook) or as the polling
  // fallback on /billing/return — both converge to the materialized state.
  const anon = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  );
  const { data: signUp, error } = await anon.auth.signUp({
    email: pending.email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/confirm?next=${encodeURIComponent("/?welcome=true")}`,
      data: {
        name: data.name,
        dni: data.dni,
        matricula: data.matricula,
        phone: data.phone,
        especialidad: data.especialidad,
      },
    },
  });
  if (error || !signUp.user) {
    throw new Error(
      `[reconcile] auth signUp failed for pending ${pending.id}: ${error?.message ?? "no user"}`,
    );
  }

  const userId = signUp.user.id;
  const admin = createServiceClient();

  // Doctor row is auto-created by the on_auth_user_created trigger from
  // raw_user_meta_data. Apply the optional extras that don't fit there.
  const docUpdates: Record<string, string> = {};
  if (data.firmaDigital) docUpdates.firma_digital = data.firmaDigital;
  if (data.avatar) docUpdates.avatar = data.avatar;
  if (data.tagline) docUpdates.tagline = data.tagline;
  if (Object.keys(docUpdates).length > 0) {
    await admin.from("doctors").update(docUpdates).eq("id", userId);
  }

  // Free subscription row was auto-created by handle_new_user_subscription.
  // Promote it to the paid plan with the MP linkage.
  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: planTierFromAmount(preapproval),
      status: mapPreapprovalStatus(preapproval.status),
      mp_preapproval_id: preapproval.id,
      mp_payer_id: preapproval.payer_id ? String(preapproval.payer_id) : null,
      current_period_end: preapproval.next_payment_date,
      cancelled_at: null,
    },
    { onConflict: "user_id" },
  );

  // Consume the staging row last — only after the materialization commits.
  await admin.from("pending_signups").delete().eq("id", pending.id);

  return userId;
}

export async function reconcilePreapproval(
  preapprovalId: string,
  options: { refOverride?: string | null } = {},
): Promise<ReconcileResult> {
  const preapproval = await getPreapproval(preapprovalId);
  const admin = createServiceClient();

  // Path A: do we already know this preapproval? Once /billing/return has
  // linked the row, every subsequent webhook event (cancel from MP portal,
  // recurring charge follow-up, plan switch) finds the user via
  // mp_preapproval_id alone — no ref needed. MP's plan-based subscription
  // checkout drops external_reference, so this is also the only branch that
  // resolves MP-portal cancellations: without it, the cancel webhook arrives
  // with an empty external_reference and our DB never flips to cancelled.
  const { data: subByPreapproval } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("mp_preapproval_id", preapproval.id)
    .maybeSingle();

  if (subByPreapproval) {
    const cancelled = preapproval.status === "cancelled";
    await admin.from("subscriptions").upsert(
      {
        user_id: subByPreapproval.user_id,
        // MP cancellation downgrades to the free tier — both via this app's
        // cancel button and via the doctor's MP portal. We keep the MP linkage
        // (preapproval/payer ids) so webhook replays remain idempotent and a
        // re-subscription can still resolve by mp_preapproval_id.
        plan: cancelled ? "free" : planTierFromAmount(preapproval),
        status: mapPreapprovalStatus(preapproval.status),
        mp_preapproval_id: preapproval.id,
        mp_payer_id: preapproval.payer_id
          ? String(preapproval.payer_id)
          : null,
        current_period_end: preapproval.next_payment_date,
        cancelled_at: cancelled ? new Date().toISOString() : null,
      },
      { onConflict: "user_id" },
    );
    return {
      kind: "subscription-updated",
      userId: subByPreapproval.user_id,
    };
  }

  // Otherwise we need a ref. /billing/return passes one from a signed cookie;
  // the webhook only has external_reference, which MP drops for plan-based
  // subscriptions. In the happy path /billing/return runs first and links
  // the row, so the cancel/replay branch above handles everything after that.
  // When that path failed (cookie expired, browser closed before redirect,
  // proxy bug like the /billing-not-public regression), we fall through to
  // a payer-email lookup against pending_signups.
  const ref = preapproval.external_reference || options.refOverride || null;
  let pending: PendingSignupRow | null = null;

  if (ref) {
    const { data } = await admin
      .from("pending_signups")
      .select("id, email, encrypted_password, signup_data")
      .eq("id", ref)
      .maybeSingle<PendingSignupRow>();
    pending = data;
  }

  if (!pending && preapproval.status === "authorized") {
    pending = await findPendingSignupByPayerEmail(preapproval.id);
  }

  // Path B: external_reference / payer-email match → staged signup awaiting payment.

  if (pending) {
    if (preapproval.status === "authorized") {
      const userId = await materializePendingSignup(pending, preapproval);
      return { kind: "materialized", userId, pendingSignupId: pending.id };
    }
    if (preapproval.status === "cancelled") {
      await admin.from("pending_signups").delete().eq("id", pending.id);
      return { kind: "pending-signup-cancelled", pendingSignupId: pending.id };
    }
    return { kind: "pending-signup-waiting", pendingSignupId: pending.id };
  }

  if (!ref) {
    Sentry.captureMessage(
      "[reconcile] preapproval has no external_reference, no refOverride, no matching subscription, and no pending_signup match by payer email",
      {
        level: "warning",
        tags: { flow: "reconcile-no-ref" },
        extra: { preapprovalId, status: preapproval.status },
      },
    );
    return { kind: "no-ref" };
  }

  // Path C: existing-user first-time link via external_reference=user.id.
  // Every doctor has a subscription row (the on_auth_user_created trigger
  // creates a free one), so subByUser is expected to be present in
  // production.
  const { data: subByUser } = await admin
    .from("subscriptions")
    .select("user_id, mp_preapproval_id")
    .eq("user_id", ref)
    .maybeSingle();

  // Stale-cancellation guard: after a plan switch the OLD preapproval gets
  // cancelled at MP, which fires a cancel webhook. By the time it arrives,
  // the row is already bound to the NEW preapproval. Don't flip the user
  // back to cancelled.
  if (
    subByUser?.mp_preapproval_id &&
    subByUser.mp_preapproval_id !== preapproval.id &&
    preapproval.status === "cancelled"
  ) {
    console.info(
      `[reconcile] ignoring stale cancellation for ${preapproval.id}; ` +
        `row is bound to ${subByUser.mp_preapproval_id}`,
    );
    return {
      kind: "stale",
      reason: `row bound to ${subByUser.mp_preapproval_id}`,
    };
  }

  const previousPreapprovalId =
    subByUser?.mp_preapproval_id &&
    subByUser.mp_preapproval_id !== preapproval.id &&
    preapproval.status === "authorized"
      ? subByUser.mp_preapproval_id
      : null;

  const userId = subByUser?.user_id ?? ref;
  const cancelledC = preapproval.status === "cancelled";

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: cancelledC ? "free" : planTierFromAmount(preapproval),
      status: mapPreapprovalStatus(preapproval.status),
      mp_preapproval_id: preapproval.id,
      mp_payer_id: preapproval.payer_id ? String(preapproval.payer_id) : null,
      current_period_end: preapproval.next_payment_date,
      cancelled_at: cancelledC ? new Date().toISOString() : null,
    },
    { onConflict: "user_id" },
  );

  if (previousPreapprovalId) {
    try {
      await updatePreapprovalStatus(previousPreapprovalId, "cancelled");
    } catch (err) {
      console.error(
        `[reconcile] failed to cancel old preapproval ${previousPreapprovalId} after switch`,
        err,
      );
      Sentry.captureException(err, {
        tags: { flow: "reconcile-switch-cleanup" },
        extra: {
          previousPreapprovalId,
          newPreapprovalId: preapproval.id,
          userId,
        },
      });
    }
  }

  return { kind: "subscription-updated", userId };
}
