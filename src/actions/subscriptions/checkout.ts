"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { createPreapproval } from "@/lib/mercadopago/api";
import type { ProPlanTier } from "@/types/subscription";

interface PlanConfig {
  arsAmount: number;
  frequency: number;
  frequencyType: "months";
  reason: string;
}

const PLAN_CONFIG: Record<ProPlanTier, PlanConfig> = {
  pro_monthly: {
    arsAmount: 15,
    frequency: 1,
    frequencyType: "months",
    reason: "IMI Health Pro — mensual",
  },
  pro_yearly: {
    arsAmount: 75,
    frequency: 12,
    frequencyType: "months",
    reason: "IMI Health Pro — anual",
  },
};

export async function getCurrentArsPrice(plan: ProPlanTier): Promise<number> {
  return PLAN_CONFIG[plan].arsAmount;
}

async function createCheckoutPreapproval(
  plan: ProPlanTier,
  externalReference: string,
  appUrl: string,
): Promise<{ initPoint: string }> {
  const config = PLAN_CONFIG[plan];
  const startDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const preapproval = await createPreapproval(
    {
      reason: config.reason,
      external_reference: externalReference,
      back_url: `${appUrl}/billing/return`,
      status: "pending",
      auto_recurring: {
        frequency: config.frequency,
        frequency_type: config.frequencyType,
        transaction_amount: config.arsAmount,
        currency_id: "ARS",
        start_date: startDate,
      },
    },
    `${externalReference}:${plan}:${Date.now()}`,
  );
  return { initPoint: preapproval.init_point };
}

export async function startProCheckout(
  plan: ProPlanTier,
  userId: string,
): Promise<{ initPoint?: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "La aplicación no está configurada para cobros." };
  }

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
    return await createCheckoutPreapproval(plan, userId, appUrl);
  } catch (err) {
    console.error("[billing] createPreapproval failed", err);
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
export async function startProCheckoutForPendingSignup(
  pendingSignupId: string,
  plan: ProPlanTier,
): Promise<{ initPoint?: string; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "La aplicación no está configurada para cobros." };
  }

  try {
    return await createCheckoutPreapproval(plan, pendingSignupId, appUrl);
  } catch (err) {
    console.error("[billing] createPreapproval (pending) failed", err);
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "No autenticado" };
  }

  return startProCheckout(plan, user.id);
}
