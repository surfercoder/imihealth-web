"use server";

import { z } from "zod";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import {
  createPreapproval,
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
  planIdEnv: string;
  amount: number;
  frequency: number;
  frequencyType: "months";
}

const PLAN_CONFIG: Record<ProPlanTier, PlanConfig> = {
  pro_monthly: {
    planIdEnv: "MERCADOPAGO_PRO_MONTHLY_PLAN_ID",
    amount: 30000,
    frequency: 1,
    frequencyType: "months",
  },
  pro_yearly: {
    planIdEnv: "MERCADOPAGO_PRO_YEARLY_PLAN_ID",
    amount: 300000,
    frequency: 12,
    frequencyType: "months",
  },
};

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

  const config = PLAN_CONFIG[plan];
  const planId = process.env[config.planIdEnv];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!planId || !appUrl) {
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

  let preapproval;
  try {
    preapproval = await createPreapproval({
      preapproval_plan_id: planId,
      reason:
        plan === "pro_monthly"
          ? "IMI Health Pro — mensual"
          : "IMI Health Pro — anual",
      external_reference: user.id,
      payer_email: user.email,
      back_url: `${appUrl}/billing/return`,
      status: "pending",
      auto_recurring: {
        frequency: config.frequency,
        frequency_type: config.frequencyType,
        transaction_amount: config.amount,
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
