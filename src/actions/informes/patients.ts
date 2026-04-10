"use server";

import { createClient } from "@/utils/supabase/server";

export async function createPatient(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const name = formData.get("name") as string;
  const dni = formData.get("dni") as string;
  const dob = (formData.get("dob") as string) || null;
  /* v8 ignore next */
  const phone = (formData.get("phone") as string) || null;
  const email = formData.get("email") as string;
  const obraSocial = (formData.get("obraSocial") as string) || null;
  const nroAfiliado = (formData.get("nroAfiliado") as string) || null;
  const plan = (formData.get("plan") as string) || null;

  const { data, error } = await supabase
    .from("patients")
    .insert({
      doctor_id: user.id,
      name: name.trim(),
      dni: dni.trim(),
      dob: dob?.trim() || null,
      /* v8 ignore next 3 */
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      obra_social: obraSocial?.trim() || null,
      nro_afiliado: nroAfiliado?.trim() || null,
      plan: plan?.trim() || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data };
}
