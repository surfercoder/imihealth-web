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
): Promise<ReconcileResult> {
  const preapproval = await getPreapproval(preapprovalId);
  const admin = createServiceClient();

  const ref = preapproval.external_reference;
  if (!ref) {
    console.warn(
      `[reconcile] preapproval ${preapprovalId} has no external_reference; skipping`,
    );
    return { kind: "no-ref" };
  }

  // Path A: external_reference points at a staged signup awaiting payment.
  const { data: pending } = await admin
    .from("pending_signups")
    .select("id, email, encrypted_password, signup_data")
    .eq("id", ref)
    .maybeSingle<PendingSignupRow>();

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

  // Path B: webhook replay after materialization, OR existing-user upgrade,
  // OR a plan-switch (monthly ↔ yearly). The subscription row carries the
  // current mp_preapproval_id, so we use that to disambiguate.
  const { data: subByPreapproval } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("mp_preapproval_id", preapproval.id)
    .maybeSingle();

  if (subByPreapproval) {
    await admin.from("subscriptions").upsert(
      {
        user_id: subByPreapproval.user_id,
        plan: planTierFromAmount(preapproval),
        status: mapPreapprovalStatus(preapproval.status),
        mp_preapproval_id: preapproval.id,
        mp_payer_id: preapproval.payer_id
          ? String(preapproval.payer_id)
          : null,
        current_period_end: preapproval.next_payment_date,
        cancelled_at:
          preapproval.status === "cancelled"
            ? new Date().toISOString()
            : null,
      },
      { onConflict: "user_id" },
    );
    return {
      kind: "subscription-updated",
      userId: subByPreapproval.user_id,
    };
  }

  // No row matches by preapproval id — fall back to the external_reference,
  // which is the user.id for existing-user checkouts. Every doctor has a
  // subscription row (the on_auth_user_created trigger creates a free one),
  // so subByUser is expected to be present in production.
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

  await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: planTierFromAmount(preapproval),
      status: mapPreapprovalStatus(preapproval.status),
      mp_preapproval_id: preapproval.id,
      mp_payer_id: preapproval.payer_id ? String(preapproval.payer_id) : null,
      current_period_end: preapproval.next_payment_date,
      cancelled_at:
        preapproval.status === "cancelled"
          ? new Date().toISOString()
          : null,
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
