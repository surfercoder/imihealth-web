"use server";

import { createClient } from "@/utils/supabase/server";

export async function generatePatientPedidos(
  patientId: string,
  items: string[],
  diagnostico: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  if (!items || items.length === 0) {
    return { error: "No hay pedidos para generar" };
  }

  const { data: patient, error: fetchError } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !patient) return { error: "Paciente no encontrado" };

  const mergedParams = new URLSearchParams({ patientId });
  for (const item of items) {
    mergedParams.append("item", item);
  }
  if (diagnostico && diagnostico.trim()) {
    mergedParams.set("diagnostico", diagnostico.trim());
  }

  const mergedUrl = `/api/pdf/pedidos-patient?${mergedParams.toString()}`;

  return { mergedUrl };
}
