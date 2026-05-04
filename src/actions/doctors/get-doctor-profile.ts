"use server";

import { createClient } from "@/utils/supabase/server";

export async function getDoctorProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: doctor } = await supabase
    .from("doctors")
    .select(
      "name, email, dni, matricula, phone, especialidad, tagline, firma_digital",
    )
    .eq("id", user.id)
    .single();

  return doctor;
}
