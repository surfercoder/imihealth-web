"use server";

import { createClient } from "@/utils/supabase/server";
import { patientCreateSchema } from "@/schemas/patient";
import type { Patient } from "@/types/patient";

export async function createPatient(
  formData: FormData,
): Promise<{ data?: Patient; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const parsed = patientCreateSchema.safeParse({
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

  const { data, error } = await supabase
    .from("patients")
    .insert({
      doctor_id: user.id,
      name: parsed.data.name,
      dni: parsed.data.dni,
      dob: parsed.data.dob,
      phone: parsed.data.phone,
      email: parsed.data.email,
      obra_social: parsed.data.obra_social,
      nro_afiliado: parsed.data.nro_afiliado,
      plan: parsed.data.plan,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Patient };
}
