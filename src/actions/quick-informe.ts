"use server";

import { createClient } from "@/utils/supabase/server";
import { getSpecialtyPrompt } from "@/lib/prompts";
import {
  extractTextFromContent,
  generateDoctorReport,
  parseDoctorResponse,
  resolveTranscript,
} from "@/app/api/process-informe/helpers";

export async function processQuickInforme(
  browserTranscript: string,
  audioBlob?: Blob,
  language: string = "es"
): Promise<{ informeDoctor?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

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
      `[quick-informe] start: browserTranscriptLen=${browserTranscript.length}, isBrowserFallback=${isBrowserFallback}, audioBlobSize=${audioBlob?.size ?? 0}`,
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
      return {
        error:
          "No se pudo transcribir el audio. Verificá el micrófono y la conexión, y volvé a intentarlo.",
      };
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
      return {
        error:
          "No se detectó contenido médico relevante en la grabación. Volvé a intentarlo.",
      };
    }

    return { informeDoctor };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("[quick-informe] processing error:", err);
    return { error: message };
  }
}
