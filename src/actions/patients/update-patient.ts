"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function updatePatient(
  patientId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const name = formData.get("name") as string;
  const dni = formData.get("dni") as string;
  const dob = formData.get("dob") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

  const { error } = await supabase
    .from("patients")
    .update({
      name: name.trim(),
      dni: dni.trim(),
      dob: dob || undefined,
      phone: phone.trim(),
      email: email?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)
    .eq("doctor_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  return {};
}
