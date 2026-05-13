"use server";

import * as Sentry from "@sentry/nextjs";
import { requireAuth } from "@/utils/supabase/require-auth";
import { getSpecialtyPrompt } from "@/lib/prompts";
import { getPlanInfo } from "@/actions/subscriptions";
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
  audioPath?: string,
  language: string = "es",
  recordingDuration?: number,
): Promise<ProcessQuickInformeResult> {
  const { supabase, user } = await requireAuth();
  if (!user) return { error: "No autenticado" };

  try {
    const plan = await getPlanInfo(user.id);
    if (plan.isReadOnly) {
      return {
        error:
          "Tu suscripción Pro fue cancelada. Reactivala para crear nuevos informes.",
      };
    }
    if (!plan.canCreateInforme) {
      return {
        error: `Llegaste a los ${plan.maxInformes} informes del plan Gratis. Pasate a Pro para informes ilimitados, soporte prioritario y todo IMI Health sin restricciones.`,
      };
    }

    const { data: created, error: createError } = await supabase
      .from("informes_rapidos")
      .insert({ doctor_id: user.id, status: "processing" })
      .select("id")
      .single();

    if (createError || !created) {
      console.error("[quick-informe] failed to create row:", createError);
      return {
        error: createError?.message || "No se pudo crear el informe rápido",
      };
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
      let audioBuffer: Buffer | null = null;
      if (audioPath) {
        const { data: audioData, error: downloadError } = await supabase.storage
          .from("audio-recordings")
          .download(audioPath);
        if (downloadError) {
          // eslint-disable-next-line react-doctor/server-after-nonblocking -- diagnostic log; we don't await the response back to the user
          console.warn(
            `[quick-informe] storage download failed: ${downloadError.message}`,
          );
        } else if (audioData) {
          audioBuffer = Buffer.from(await audioData.arrayBuffer());
        }
      }

      const browserFallbackMarkers = [
        "No se pudo transcribir",
        "could not be transcribed",
      ];
      const isBrowserFallback = browserFallbackMarkers.some((marker) =>
        browserTranscript.includes(marker),
      );
      const cleanedBrowserTranscript = isBrowserFallback
        ? ""
        : browserTranscript;

      // eslint-disable-next-line react-doctor/server-after-nonblocking -- diagnostic log; we don't await the response back to the user
      console.info(
        `[quick-informe] start: id=${informeRapidoId}, browserTranscriptLen=${browserTranscript.length}, isBrowserFallback=${isBrowserFallback}, audioBufferSize=${audioBuffer?.length ?? 0}`,
      );

      const { transcript, assemblyAISucceeded } = await resolveTranscript(
        audioBuffer,
        cleanedBrowserTranscript,
        language,
      );

      const trimmedTranscript = transcript?.trim() || "";
      // eslint-disable-next-line react-doctor/server-after-nonblocking -- diagnostic log; we don't await the response back to the user
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
      const rawInformeDoctor: unknown = parsed.informeDoctor;
      const informeDoctor: string =
        typeof rawInformeDoctor === "string" ? rawInformeDoctor : "";

      if (!validMedicalContent || !informeDoctor.trim()) {
        // eslint-disable-next-line react-doctor/server-after-nonblocking -- diagnostic log; we don't await the response back to the user
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
          ...(recordingDuration != null && {
            recording_duration: recordingDuration,
          }),
        })
        .eq("id", informeRapidoId);

      if (updateError) {
        console.error(
          "[quick-informe] failed to persist completion:",
          updateError,
        );
        return await failWith(updateError.message);
      }

      return { informeRapidoId, informeDoctor };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { flow: "quick-informe" },
        extra: { informeRapidoId },
      });
      const message = err instanceof Error ? err.message : "Error desconocido";
      console.error("[quick-informe] processing error:", err);
      return await failWith(message);
    }
  } finally {
    if (audioPath) {
      const { error } = await supabase.storage
        .from("audio-recordings")
        .remove([audioPath]);
      if (error) {
        // eslint-disable-next-line react-doctor/server-after-nonblocking -- diagnostic log; we don't await the response back to the user
        console.warn(
          `[quick-informe] storage cleanup failed: ${error.message}`,
        );
      }
    }
  }
}
