"use server";

import { createClient } from "@/utils/supabase/server";

export async function generateAndSaveCertificado(
  informeId: string,
  options: {
    daysOff?: number | null;
    diagnosis?: string | null;
    observations?: string | null;
  } = {}
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const { data: informeData, error: fetchError } = await supabase
    .from("informes")
    .select("status")
    .eq("id", informeId)
    .eq("doctor_id", user.id)
    .single();

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (informeData.status !== "completed") return { error: "El informe no está completado" };

  // Build on-demand PDF URL with options as query params
  const params = new URLSearchParams({ id: informeId });
  if (options.daysOff != null) params.set("daysOff", String(options.daysOff));
  if (options.diagnosis) params.set("diagnosis", options.diagnosis);
  if (options.observations) params.set("observations", options.observations);

  return { signedUrl: `/api/pdf/certificado?${params.toString()}` };
}
