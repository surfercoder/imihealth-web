"use server";

import { createClient } from "@/utils/supabase/server";
import { MVP_LIMITS } from "@/lib/mvp-limits";

export async function createInforme(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // MVP informe limit check
  const { count: informeCount } = await supabase
    .from("informes")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", user.id);
  if ((informeCount ?? 0) >= MVP_LIMITS.MAX_INFORMES_PER_DOCTOR) {
    return { error: `Has alcanzado el límite de ${MVP_LIMITS.MAX_INFORMES_PER_DOCTOR} informes para la prueba MVP.` };
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
