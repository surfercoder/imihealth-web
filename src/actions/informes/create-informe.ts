"use server";

import { createClient } from "@/utils/supabase/server";
import { getPlanInfo } from "@/actions/plan";

export async function createInforme(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const plan = await getPlanInfo(user.id);
  if (plan.isReadOnly) {
    return { error: "Tu suscripción Pro fue cancelada. Reactivala para crear nuevos informes." };
  }
  if (!plan.canCreateInforme) {
    return { error: `Alcanzaste el límite de ${plan.maxInformes} informes del plan gratuito. Pasate al plan Pro para informes ilimitados.` };
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
