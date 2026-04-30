"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import {
  getPreapprovalPlan,
  updatePreapprovalStatus,
} from "@/lib/mercadopago/api";

const enterpriseLeadSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  contactName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type EnterpriseLeadInput = z.infer<typeof enterpriseLeadSchema>;

export async function submitEnterpriseLead(
  input: EnterpriseLeadInput,
): Promise<{ success?: true; error?: string }> {
  const parsed = enterpriseLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("enterprise_leads").insert({
    company_name: parsed.data.companyName,
    contact_name: parsed.data.contactName,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    return { error: "No se pudo enviar la consulta. Intentá nuevamente." };
  }

  return { success: true };
}

export type ProPlanTier = "pro_monthly" | "pro_yearly";

interface PlanConfig {
  /** Fixed ARS amount during testing. Production target: 30 USD/300 USD,
   *  which the original code computed via daily MP exchange rate. */
  arsAmount: number;
  frequency: number;
  frequencyType: "months";
  reason: string;
}

// TEMPORARY: production smoke-test pricing in fixed ARS. Charges are real
// money but tiny. MercadoPago rejects amounts below 15 ARS, so monthly
// is set at the floor and yearly keeps the "5 months equivalent" savings.
// Revert to USD 30 / 300 (with daily-rate ARS conversion) before public
// launch — see the pre-testing version of this file in git history for
// the USD-anchored shape.
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

function planEnvIdFor(plan: ProPlanTier): string | undefined {
  return plan === "pro_monthly"
    ? process.env.MERCADOPAGO_PRO_MONTHLY_PLAN_ID
    : process.env.MERCADOPAGO_PRO_YEARLY_PLAN_ID;
}

function buildSubscriptionInitPoint(
  baseInitPoint: string,
  externalReference: string,
): string {
  const url = new URL(baseInitPoint);
  url.searchParams.set("external_reference", externalReference);
  return url.toString();
}

/**
 * Resolves the MercadoPago checkout URL for a Pro plan, redirecting the user
 * to MP's hosted subscription page. MP creates the preapproval server-side at
 * the moment the user confirms, binding it to whatever MP account they're
 * logged in with — so we never need to know the buyer's email upfront. The
 * webhook reconciles the new preapproval back to our user via
 * `external_reference`.
 */
export async function startProCheckout(
  plan: ProPlanTier,
  userId: string,
): Promise<{ initPoint?: string; error?: string }> {
  const planId = planEnvIdFor(plan);
  if (!planId) {
    return { error: "Suscripciones no están configuradas todavía." };
  }

  const admin = createServiceClient();

  // Allow free→paid, paid→different-paid (switch monthly↔yearly), and
  // cancelled/past_due→paid (re-subscribe). The only blocked case is the
  // user trying to start the exact same plan they already have active.
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

  let mpPlan;
  try {
    mpPlan = await getPreapprovalPlan(planId);
  } catch (err) {
    console.error("[billing] getPreapprovalPlan failed", err);
    Sentry.captureException(err, { tags: { flow: "startProCheckout" } });
    return { error: "No se pudo iniciar el pago. Intentá nuevamente." };
  }

  if (mpPlan.status !== "active") {
    return { error: "El plan no está disponible. Contactá soporte." };
  }

  return { initPoint: buildSubscriptionInitPoint(mpPlan.init_point, userId) };
}

/**
 * Same as `startProCheckout` but for brand-new signups whose user/doctor/
 * subscription rows don't exist yet. The `external_reference` is the
 * pending_signups id; the webhook will look it up and materialize the
 * auth.users + doctor + subscription rows on payment authorization.
 */
export async function startProCheckoutForPendingSignup(
  pendingSignupId: string,
  plan: ProPlanTier,
): Promise<{ initPoint?: string; error?: string }> {
  const planId = planEnvIdFor(plan);
  if (!planId) {
    return { error: "Suscripciones no están configuradas todavía." };
  }

  let mpPlan;
  try {
    mpPlan = await getPreapprovalPlan(planId);
  } catch (err) {
    console.error("[billing] getPreapprovalPlan failed", err);
    Sentry.captureException(err, {
      tags: { flow: "startProCheckoutForPendingSignup" },
      extra: { pendingSignupId, plan },
    });
    return { error: "No se pudo iniciar el pago. Intentá nuevamente." };
  }

  if (mpPlan.status !== "active") {
    return { error: "El plan no está disponible. Contactá soporte." };
  }

  return {
    initPoint: buildSubscriptionInitPoint(mpPlan.init_point, pendingSignupId),
  };
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

export async function cancelSubscription(): Promise<{
  success?: true;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const admin = createServiceClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan, status, mp_preapproval_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub || sub.plan === "free") {
    return { error: "No tenés una suscripción activa." };
  }
  if (sub.status === "cancelled") {
    return { error: "La suscripción ya está cancelada." };
  }
  if (!sub.mp_preapproval_id) {
    return { error: "No se encontró la suscripción en MercadoPago." };
  }

  try {
    await updatePreapprovalStatus(sub.mp_preapproval_id, "cancelled");
  } catch (err) {
    console.error("[billing] cancelPreapproval failed", err);
    return { error: "No se pudo cancelar en MercadoPago. Intentá nuevamente." };
  }

  await admin
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return { success: true };
}
