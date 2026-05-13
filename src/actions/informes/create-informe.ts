"use server";

import { requireAuth } from "@/utils/supabase/require-auth";
import { getPlanInfo } from "@/actions/subscriptions";

export async function createInforme(patientId: string) {
  const { supabase, user } = await requireAuth();
  if (!user) return { error: "No autenticado" };

  const plan = await getPlanInfo(user.id);
  if (plan.isReadOnly) {
    return { error: "Tu suscripción Pro fue cancelada. Reactivala para crear nuevos informes." };
  }
  if (!plan.canCreateInforme) {
    return { error: `Llegaste a los ${plan.maxInformes} informes del plan Gratis. Pasate a Pro para informes ilimitados, soporte prioritario y todo IMI Health sin restricciones.` };
  }

  const { data, error } = await supabase
    .from("informes")
    .insert({
      doctor_id: user.id,
      patient_id: patientId,
      status: "recording",
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}
