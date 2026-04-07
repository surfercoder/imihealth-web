"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteInforme(informeId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: informe, error: fetchError } = await supabase
    .from("informes")
    .select("id, patient_id")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informe) return { error: "Informe no encontrado" };

  const { error: deleteError } = await supabase
    .from("informes")
    .delete()
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (deleteError) return { error: deleteError.message };

  revalidatePath("/");
  revalidatePath(`/patients/${informe.patient_id}`);
  return { success: true };
}
