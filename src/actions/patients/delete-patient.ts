"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deletePatient(patientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // Verify the patient belongs to this doctor
  const { data: patient, error: fetchError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !patient) return { error: "Paciente no encontrado" };

  // Delete patient — informes are cascade-deleted by FK constraint
  const { error: deleteError } = await supabase
    .from("patients")
    .delete()
    .eq("id", patientId)
    .eq("doctor_id", user.id);

  if (deleteError) return { error: deleteError.message };

  revalidatePath("/");
  return { success: true };
}
