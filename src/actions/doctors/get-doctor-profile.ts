"use server";

import { requireAuth } from "@/utils/supabase/require-auth";

export async function getDoctorProfile() {
  const { supabase, user } = await requireAuth();
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
