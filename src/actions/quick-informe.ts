"use server";

import { createClient } from "@/utils/supabase/server";
import { getSpecialtyPrompt } from "@/lib/prompts";
import { MVP_LIMITS } from "@/lib/mvp-limits";
import {
  extractTextFromContent,
  generateDoctorReport,
  parseDoctorResponse,
  resolveTranscript,
} from "@/app/api/process-informe/helpers";

type ProcessQuickInformeResult = {
  informeRapidoId?: string;
  informeDoctor?: string;
  error?: string;
};

export async function processQuickInforme(
  browserTranscript: string,
  audioBlob?: Blob,
  language: string = "es",
  recordingDuration?: number,
): Promise<ProcessQuickInformeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  // MVP informe limit check (counts both classic & quick, based on immutable generation log)
  const { count: informeCount } = await supabase
    .from("inform_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", user.id);
  if ((informeCount ?? 0) >= MVP_LIMITS.MAX_INFORMES_PER_DOCTOR) {
    return { error: `Has alcanzado el límite de ${MVP_LIMITS.MAX_INFORMES_PER_DOCTOR} informes para la prueba MVP.` };
  }

  // Create the persistent record up-front so we have an id we can update at
  // the end (which fires Supabase Realtime → notification on the client).
  const { data: created, error: createError } = await supabase
    .from("informes_rapidos")
    .insert({ doctor_id: user.id, status: "processing" })
    .select("id")
    .single();

  if (createError || !created) {
    console.error("[quick-informe] failed to create row:", createError);
    return { error: createError?.message || "No se pudo crear el informe rápido" };
  }

  const informeRapidoId = created.id as string;

  const failWith = async (errorMessage: string) => {
    await supabase
      .from("informes_rapidos")
      .update({
        status: "error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", informeRapidoId);
    return { informeRapidoId, error: errorMessage };
  };

  try {
    // The browser may pass through a localized fallback string when its
    // SpeechRecognition produced nothing. Treat that as "no transcript" so we
    // don't end up sending the literal error message to AssemblyAI/Anthropic.
    const browserFallbackMarkers = [
      "No se pudo transcribir",
      "could not be transcribed",
    ];
    const isBrowserFallback = browserFallbackMarkers.some((marker) =>
      browserTranscript.includes(marker),
    );
    const cleanedBrowserTranscript = isBrowserFallback ? "" : browserTranscript;

    console.info(
      `[quick-informe] start: id=${informeRapidoId}, browserTranscriptLen=${browserTranscript.length}, isBrowserFallback=${isBrowserFallback}, audioBlobSize=${audioBlob?.size ?? 0}`,
    );

    const { transcript, assemblyAISucceeded } = await resolveTranscript(
      audioBlob ?? null,
      cleanedBrowserTranscript,
      language,
    );

    const trimmedTranscript = transcript?.trim() || "";
    console.info(
      `[quick-informe] transcript ready: len=${trimmedTranscript.length}, assemblyAISucceeded=${assemblyAISucceeded}`,
    );

    if (trimmedTranscript.length < 10) {
      return await failWith(
        "No se pudo transcribir el audio. Verificá el micrófono y la conexión, y volvé a intentarlo.",
      );
    }

    const { data: doctorData } = await supabase
      .from("doctors")
      .select("especialidad")
      .eq("id", user.id)
      .single();

    const specialtyPrompt = getSpecialtyPrompt(doctorData?.especialidad);

    const doctorResponse = await generateDoctorReport(
      trimmedTranscript,
      specialtyPrompt,
    );
    const doctorText = extractTextFromContent(doctorResponse);

    const parsed = parseDoctorResponse(doctorText);
    const { validMedicalContent } = parsed;
    // Defensive: if a stale or buggy parser returns a non-string here, coerce
    // to empty so the no-content branch fires instead of crashing.
    const rawInformeDoctor: unknown = parsed.informeDoctor;
    const informeDoctor: string =
      typeof rawInformeDoctor === "string" ? rawInformeDoctor : "";

    if (!validMedicalContent || !informeDoctor.trim()) {
      console.warn(
        `[quick-informe] no usable doctor report: validMedicalContent=${validMedicalContent}, informeDoctorType=${typeof rawInformeDoctor}, informeDoctorLen=${informeDoctor.length}`,
      );
      return await failWith(
        "No se detectó contenido médico relevante en la grabación. Volvé a intentarlo.",
      );
    }

    const { error: updateError } = await supabase
      .from("informes_rapidos")
      .update({
        status: "completed",
        informe_doctor: informeDoctor,
        updated_at: new Date().toISOString(),
        ...(recordingDuration != null && { recording_duration: recordingDuration }),
      })
      .eq("id", informeRapidoId);

    if (updateError) {
      console.error("[quick-informe] failed to persist completion:", updateError);
      return await failWith(updateError.message);
    }

    return { informeRapidoId, informeDoctor };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[quick-informe] processing error:", err);
    return await failWith(message);
  }
}
