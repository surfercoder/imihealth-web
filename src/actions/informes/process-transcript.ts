"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { transcribeAudio } from "@/lib/transcribe";
import { getSpecialtyPrompt } from "@/lib/prompts";
import { ANTHROPIC_MODEL } from "@/lib/ai-model";
import { anthropic } from "./anthropic-client";

export async function processInformeFromTranscript(
  informeId: string,
  browserTranscript: string,
  audioBase64?: string,
  audioContentType?: string,
  language: string = "es"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  await supabase
    .from("informes")
    .update({ status: "processing" })
    .eq("id", informeId)
    .eq("doctor_id", user.id);

  try {
    // Transcribe audio with AssemblyAI for accurate medical transcription
    let transcript = browserTranscript;
    if (audioBase64) {
      try {
        const audioBuffer = Buffer.from(audioBase64, "base64");
        /* v8 ignore next */
        const langCode = language === "en" ? "en" : "es";
        const result = await transcribeAudio(audioBuffer, langCode);
        if (result.text) {
          transcript = result.text;
        }
      } catch (transcribeError) {
        console.warn("AssemblyAI transcription failed, falling back to browser transcript:", transcribeError);
        // Continue with browser transcript as fallback
      }
    }

    const { data: doctorResult } = await supabase
      .from("doctors")
      .select("especialidad")
      .eq("id", user.id)
      .single();

    const specialtyPrompt = getSpecialtyPrompt(doctorResult?.especialidad);

    const reportsResponse = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: specialtyPrompt,
      messages: [
        {
          role: "user",
          content: `Genera DOS informes de esta consulta médica. JSON puro (sin markdown):
{"valid_medical_content": true/false, "informe_doctor": "...", "informe_paciente": "..."}

- valid_medical_content=false si no hay info médica útil (ruido, pruebas, etc). En ese caso todos los campos vacíos.
- informe_doctor: Sigue ESTRICTAMENTE el formato de tus instrucciones de sistema. Técnico, con CIE-10 y scores.
- informe_paciente: Lenguaje simple y cálido. Incluye resumen, medicamentos (nombre, para qué, cuándo), recomendaciones y próximos pasos.

TRANSCRIPCIÓN:
${transcript}`,
        },
      ],
    });

    const reportsText =
      reportsResponse.content[0].type === "text"
        ? reportsResponse.content[0].text
        : "{}";

    let informeDoctor = "";
    let informePaciente = "";
    const jsonMatch = reportsText.match(/\{[\s\S]*\}/);
    let validMedicalContent = true;
    try {
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reportsText);
      validMedicalContent = parsed.valid_medical_content !== false;
      informeDoctor = parsed.informe_doctor || "";
      informePaciente = parsed.informe_paciente || "";
    } catch {
      informeDoctor = reportsText;
      informePaciente = reportsText;
    }

    // If Claude determined there's no valid medical content, reset the informe and abort
    if (!validMedicalContent || (!informeDoctor.trim() && !informePaciente.trim())) {
      // Reset informe back to "recording" status so it doesn't pollute the DB
      await supabase
        .from("informes")
        .update({ status: "recording" })
        .eq("id", informeId)
        .eq("doctor_id", user.id);

      return { insufficientContent: true };
    }

    const { error: updateError } = await supabase
      .from("informes")
      .update({
        status: "completed",
        informe_doctor: informeDoctor,
        informe_paciente: informePaciente,
      })
      .eq("id", informeId)
      .eq("doctor_id", user.id);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/");
    revalidatePath(`/informes/${informeId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await supabase
      .from("informes")
      .update({ status: "error" })
      .eq("id", informeId)
      .eq("doctor_id", user.id);
    return { error: message };
  }
}
