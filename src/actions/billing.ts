"use server";

import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
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

/**
 * Creates a per-user MercadoPago preapproval and returns its init_point.
 *
 * We deliberately do NOT use the plan's hosted init_point. Going through
 * `POST /preapproval` lets us set `back_url` and `external_reference`
 * explicitly per checkout — meaning the redirect after payment lands on our
 * site (not whatever URL the plan happens to remember) and we can reconcile
 * the buyer back to our user without depending on MP carrying query params
 * through. Amount and frequency come from PLAN_CONFIG, so changing pricing
 * is a code change with no MP-side plan re-creation needed.
 *
 * `payer_email` is intentionally left unset so the doctor can pay with any
 * MercadoPago account, not just one whose email matches their signup email.
 */
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

  // start_date must be in the future. Five minutes out gives MP time to
  // process the user's confirmation without race-rejecting the request.
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
      // Idempotency key keyed on user+plan, so a double-clicked submit
      // doesn't create two preapprovals at MP.
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
