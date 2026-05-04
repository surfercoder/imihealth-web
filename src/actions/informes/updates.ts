"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateInformeDoctorOnly(
  informeId: string,
  informeDoctor: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_doctor: informeDoctor })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes/${informeId}`);
  return { success: true };
}

export async function updateInformePacienteWithPdf(
  informeId: string,
  informePaciente: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_paciente: informePaciente })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes/${informeId}`);
  return { success: true };
}

export async function updateInformeReports(
  informeId: string,
  informeDoctor: string,
  informePaciente: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: updateError } = await supabase
    .from("informes")
    .update({ informe_doctor: informeDoctor, informe_paciente: informePaciente })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes/${informeId}`);
  return { success: true };
}
