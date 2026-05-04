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

export async function startProCheckout(
  plan: ProPlanTier,
  userId: string,
): Promise<{ initPoint?: string; error?: string }> {
  const config = PLAN_CONFIG[plan];
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

  const startDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  try {
    const preapproval = await createPreapproval(
      {
        reason: config.reason,
        external_reference: userId,
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
      `${userId}:${plan}:${Date.now()}`,
    );
    return { initPoint: preapproval.init_point };
  } catch (err) {
    console.error("[billing] createPreapproval failed", err);
    Sentry.captureException(err, {
      tags: { flow: "startProCheckout" },
      extra: { plan, userId },
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
