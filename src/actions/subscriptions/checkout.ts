"use server";

import * as Sentry from "@sentry/nextjs";
import { cookies } from "next/headers";
import { createServiceClient } from "@/utils/supabase/server";
import { requireAuth } from "@/utils/supabase/require-auth";
import { getPreapprovalPlan } from "@/lib/mercadopago/api";
import { setCheckoutRefCookie } from "@/lib/billing/checkout-ref-cookie";
import type { ProPlanTier } from "@/types/subscription";

function planEnvIdFor(plan: ProPlanTier): string | undefined {
  return plan === "pro_monthly"
    ? process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID
    : process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID;
}

// Reads the locked ARS amount straight off the MP plan, so the price
// rendered on /pricing always equals what we'll actually charge. The
// pricing page wraps this in try/catch and degrades to USD-only if MP
// is unreachable.
// eslint-disable-next-line react-doctor/server-auth-actions -- public pricing read; no user context required
export async function getCurrentArsPrice(plan: ProPlanTier): Promise<number> {
  const planId = planEnvIdFor(plan);
  if (!planId) {
    throw new Error(`MercadoPago plan id not configured for ${plan}`);
  }
  const mpPlan = await getPreapprovalPlan(planId);
  return mpPlan.auto_recurring.transaction_amount;
}

// Plan-based redirect: we never POST /preapproval ourselves (which would
// require payer_email and lock the buyer to a specific MP account). MP
// creates the preapproval at confirm time, bound to whichever MP account
// the buyer logs in with. MP also strips any external_reference we try to
// pass via the init_point URL, so we stash the ref in a signed cookie
// (`mp_checkout_ref`) and /billing/return reads it back to link the new
// preapproval to the right user / pending signup.
async function resolvePlanInitPoint(
  plan: ProPlanTier,
  ref: string,
): Promise<{ initPoint: string }> {
  const planId = planEnvIdFor(plan);
  if (!planId) {
    throw new Error(`MercadoPago plan id not configured for ${plan}`);
  }
  const mpPlan = await getPreapprovalPlan(planId);
  if (mpPlan.status !== "active") {
    throw new Error(`MercadoPago plan ${planId} is not active (${mpPlan.status})`);
  }
  const store = await cookies();
  setCheckoutRefCookie(store, ref);
  return { initPoint: mpPlan.init_point };
}

// eslint-disable-next-line react-doctor/server-auth-actions -- internal helper called by createCheckout (which auths) and by the mobile API route (which auths upstream via getAuthedSupabase)
export async function startProCheckout(
  plan: ProPlanTier,
  userId: string,
): Promise<{ initPoint?: string; error?: string }> {
  const admin = createServiceClient();

  const { data: existing } = await admin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (
    existing &&
    existing.plan === plan &&
    (existing.status === "active" || existing.status === "pending")
  ) {
    return { error: "Ya tenés esta suscripción activa." };
  }

  try {
    return await resolvePlanInitPoint(plan, userId);
  } catch (err) {
    console.error("[billing] getPreapprovalPlan failed", err);
    Sentry.captureException(err, {
      tags: { flow: "startProCheckout" },
      extra: { plan, userId },
    });
    return { error: "No se pudo iniciar el pago. Intentá nuevamente." };
  }
}

// Variant for brand-new signups whose auth.users / doctors / subscriptions
// rows don't exist yet. external_reference is the pending_signups id; the
// MP webhook (and /billing/return reconcile) look it up to materialize the
// account on payment authorization.
// eslint-disable-next-line react-doctor/server-auth-actions -- runs pre-account; pendingSignupId is the bearer of identity
export async function startProCheckoutForPendingSignup(
  pendingSignupId: string,
  plan: ProPlanTier,
): Promise<{ initPoint?: string; error?: string }> {
  try {
    return await resolvePlanInitPoint(plan, pendingSignupId);
  } catch (err) {
    console.error("[billing] getPreapprovalPlan (pending) failed", err);
    Sentry.captureException(err, {
      tags: { flow: "startProCheckoutForPendingSignup" },
      extra: { plan, pendingSignupId },
    });
    return { error: "No se pudo iniciar el pago. Intentá nuevamente." };
  }
}

export async function createCheckout(
  plan: ProPlanTier,
): Promise<{ initPoint?: string; error?: string }> {
  const { user } = await requireAuth();
  if (!user) return { error: "No autenticado" };
  return startProCheckout(plan, user.id);
}
