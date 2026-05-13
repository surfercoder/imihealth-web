"use server";

import { createServiceClient } from "@/utils/supabase/server";
import { requireAuth } from "@/utils/supabase/require-auth";
import { updatePreapprovalStatus } from "@/lib/mercadopago/api";

export async function cancelSubscription(): Promise<{
  success?: true;
  error?: string;
}> {
  const { user } = await requireAuth();
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
    return {
      error: "No se pudo cancelar en MercadoPago. Intentá nuevamente.",
    };
  }

  // Drop straight back to the free plan. We keep the MP linkage so the
  // webhook's later "cancelled" event still finds the row by
  // mp_preapproval_id and idempotently no-ops.
  await admin
    .from("subscriptions")
    .update({
      plan: "free",
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return { success: true };
}
