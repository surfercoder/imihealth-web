"use server";

import { z } from "zod";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import {
  createPreapproval,
  getUsdToArsRate,
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
  usdAmount: number;
  frequency: number;
  frequencyType: "months";
  reason: string;
}

const PLAN_CONFIG: Record<ProPlanTier, PlanConfig> = {
  pro_monthly: {
    usdAmount: 30,
    frequency: 1,
    frequencyType: "months",
    reason: "IMI Health Pro — mensual",
  },
  pro_yearly: {
    usdAmount: 300,
    frequency: 12,
    frequencyType: "months",
    reason: "IMI Health Pro — anual",
  },
};

/** USD prices are anchored; the ARS amount is computed from MP's daily rate at checkout time. */
export async function getUsdPrice(plan: ProPlanTier): Promise<number> {
  return PLAN_CONFIG[plan].usdAmount;
}

/** Rounds to whole ARS — MP rejects fractional amounts. */
function usdToArs(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

export async function getCurrentArsPrice(plan: ProPlanTier): Promise<number> {
  const rate = await getUsdToArsRate();
  return usdToArs(PLAN_CONFIG[plan].usdAmount, rate);
}

export async function createCheckout(
  plan: ProPlanTier,
): Promise<{ initPoint?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { error: "No autenticado" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return { error: "Suscripciones no están configuradas todavía." };
  }

  const admin = createServiceClient();

  // Block re-checkout for users who already have an active or in-grace Pro
  // subscription — they should manage it instead.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    existing &&
    existing.plan !== "free" &&
    (existing.status === "active" || existing.status === "pending")
  ) {
    return { error: "Ya tenés una suscripción Pro activa." };
  }

  const config = PLAN_CONFIG[plan];

  let arsAmount: number;
  try {
    const rate = await getUsdToArsRate();
    arsAmount = usdToArs(config.usdAmount, rate);
  } catch (err) {
    console.error("[billing] getUsdToArsRate failed", err);
    return { error: "No se pudo obtener el tipo de cambio. Intentá nuevamente." };
  }

  // Standalone preapproval (no plan_id) — gives us a per-user ARS amount that
  // reflects the FX rate at signup time. Subscribers stay locked to that
  // amount; new signups always get the latest rate.
  let preapproval;
  try {
    preapproval = await createPreapproval({
      reason: config.reason,
      external_reference: user.id,
      payer_email: user.email,
      back_url: `${appUrl}/billing/return`,
      status: "pending",
      auto_recurring: {
        frequency: config.frequency,
        frequency_type: config.frequencyType,
        transaction_amount: arsAmount,
        currency_id: "ARS",
      },
    });
  } catch (err) {
    console.error("[billing] createPreapproval failed", err);
    return { error: "No se pudo iniciar el pago. Intentá nuevamente." };
  }

  await admin
    .from("subscriptions")
    .upsert(
      {
        user_id: user.id,
        plan,
        status: "pending",
        mp_preapproval_id: preapproval.id,
      },
      { onConflict: "user_id" },
    );

  return { initPoint: preapproval.init_point };
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
