"use server";

import { createClient } from "@/utils/supabase/server";
import { getSpecialtyPrompt } from "@/lib/prompts";
import { ANTHROPIC_MODEL } from "@/lib/ai-model";
import { getPlanInfo } from "@/actions/plan";
import { anthropic } from "./anthropic-client";
import { updateInformeReports } from "./updates";

export async function regenerateReportFromEdits(
  informeId: string,
  editedDoctor: string,
  editedPaciente: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const plan = await getPlanInfo(user.id);
  if (plan.isReadOnly) {
    return { error: "Tu suscripción Pro fue cancelada. Reactivala para regenerar informes." };
  }

  const [informeResult, doctorResult] = await Promise.all([
    supabase
      .from("informes")
      .select("id, transcript")
      .eq("id", informeId)
      .eq("doctor_id", user.id)
      .single(),
    supabase
      .from("doctors")
      .select("especialidad")
      .eq("id", user.id)
      .single(),
  ]);

  const { data: informeData, error: fetchError } = informeResult;

  if (fetchError || !informeData) return { error: "Informe no encontrado" };
  if (!informeData.transcript) return { error: "No hay transcripción disponible" };

  /* v8 ignore next */
  const specialtyPrompt = getSpecialtyPrompt(doctorResult.data?.especialidad);

  try {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: specialtyPrompt,
      messages: [
        {
          role: "user",
          content: `Regenera ambos informes incorporando las ediciones del doctor. JSON puro (sin markdown):
{"informe_doctor": "...", "informe_paciente": "..."}

Mantén las ediciones como base, mejorando coherencia y formato según la especialidad.

TRANSCRIPCIÓN ORIGINAL:
${informeData.transcript}

INFORME DOCTOR (editado):
${editedDoctor}

INFORME PACIENTE (editado):
${editedPaciente}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "{}";

    let finalDoctor = editedDoctor;
    let finalPaciente = editedPaciente;

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
      if (parsed.informe_doctor) finalDoctor = parsed.informe_doctor;
      if (parsed.informe_paciente) finalPaciente = parsed.informe_paciente;
    } catch {
      // Fall back to edited versions
    }

    return await updateInformeReports(informeId, finalDoctor, finalPaciente);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { error: message };
  }
}
