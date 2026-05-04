"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateQuickInformeDoctorOnly(
  informeId: string,
  informeDoctor: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { error: updateError } = await supabase
    .from("informes_rapidos")
    .update({ informe_doctor: informeDoctor })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/informes-rapidos/${informeId}`);
  return { success: true };
}
