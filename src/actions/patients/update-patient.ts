"use server";

import { requireAuth } from "@/utils/supabase/require-auth";
import { revalidatePath } from "next/cache";
import { patientUpdateSchema } from "@/schemas/patient";

export async function updatePatient(
  patientId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = patientUpdateSchema.safeParse({
    name: formData.get("name") ?? "",
    dni: formData.get("dni"),
    dob: formData.get("dob"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    obra_social: formData.get("obraSocial"),
    nro_afiliado: formData.get("nroAfiliado"),
    plan: formData.get("plan"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { supabase, user } = await requireAuth();
  if (!user) return { error: "No autenticado" };

  const { error } = await supabase
    .from("patients")
    .update({
      name: parsed.data.name,
      dni: parsed.data.dni,
      dob: parsed.data.dob,
      phone: parsed.data.phone,
      email: parsed.data.email,
      obra_social: parsed.data.obra_social,
      nro_afiliado: parsed.data.nro_afiliado,
      plan: parsed.data.plan,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)
    .eq("doctor_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/");
  return {};
}
