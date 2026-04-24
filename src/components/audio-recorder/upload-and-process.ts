"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { RecorderAction } from "./recorder-state";

export async function uploadAndProcess(
  dispatch: React.Dispatch<RecorderAction>,
  chunks: Blob[],
  mimeType: string,
  doctorId: string,
  informeId: string,
  finalTranscript: string,
  fallbackText: string,
  t: (key: string) => string,
  router: ReturnType<typeof useRouter>,
  locale: string,
  tab?: string | null,
  isQuickReport?: boolean,
  onQuickReportComplete?: (informeRapidoId: string) => void,
  recordingDuration?: number,
) {
  void doctorId;
  dispatch({ type: "SET_PHASE", phase: "uploading" });
  dispatch({ type: "SET_PROGRESS", progress: 20 });

  const blob = new Blob(chunks, { type: mimeType });
  const transcriptToUse = finalTranscript || fallbackText;

  // For quick reports, skip database storage and use processQuickInforme
  if (isQuickReport) {
    dispatch({ type: "SET_PROGRESS", progress: 30 });
    dispatch({ type: "SET_PHASE", phase: "transcribing" });

    const { processQuickInforme } = await import("@/actions/quick-informe");

    dispatch({ type: "SET_PROGRESS", progress: 50 });
    dispatch({ type: "SET_PHASE", phase: "processing" });

    const result = await processQuickInforme(transcriptToUse, blob, locale, recordingDuration);
    dispatch({ type: "SET_PROGRESS", progress: 100 });

    if (result.error) {
      // Expected user-facing errors (no medical content, transcription failure)
      // are not crashes — don't pollute Sentry with them.
      const expectedErrors = [
        "No se detectó contenido médico relevante",
        "No se pudo transcribir el audio",
      ];
      const isExpected = expectedErrors.some((msg) => result.error!.includes(msg));
      if (!isExpected) {
        Sentry.captureMessage(result.error, {
          level: "error",
          tags: { flow: "quick-informe-client" },
        });
      }
      dispatch({ type: "SET_ERROR", error: result.error });
      dispatch({ type: "SET_PHASE", phase: "error" });
      toast.error(t("errorProcess"), { description: result.error });
    } else if (result.informeDoctor && result.informeRapidoId) {
      dispatch({ type: "SET_PHASE", phase: "done" });
      toast.success(t("successTitle"), { description: t("successDescription") });
      // The report is persisted in `informes_rapidos`; hand the row id back
      // to the parent so it can navigate to the persistent result page.
      // The same id is what the realtime notification subscription uses to
      // route doctors from the toast on other devices.
      const informeRapidoId = result.informeRapidoId;
      setTimeout(() => onQuickReportComplete?.(informeRapidoId), 1200);
    } else {
      // Defensive: action returned neither an error nor an informe.
      // Don't leave the UI stuck on the processing spinner.
      const fallbackError = t("errorProcess");
      dispatch({ type: "SET_ERROR", error: fallbackError });
      dispatch({ type: "SET_PHASE", phase: "error" });
      toast.error(fallbackError);
    }
    return;
  }

  // Classic report flow — upload audio to Supabase Storage first, then send
  // only metadata to the API route.  This avoids Vercel's 4.5 MB serverless
  // body-size limit that previously caused 413 errors on longer recordings.
  dispatch({ type: "SET_PROGRESS", progress: 30 });
  dispatch({ type: "SET_PHASE", phase: "transcribing" });

  let result: { success?: boolean; insufficientContent?: boolean; transcriptionFailed?: boolean; error?: string };
  try {
    // 1. Upload audio to Supabase Storage
    const supabase = createClient();
    /* v8 ignore next */
    const ext = mimeType.split("/")[1]?.split(";")[0] || "webm";
    const storagePath = `${informeId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("audio-recordings")
      .upload(storagePath, blob, { contentType: mimeType, upsert: true });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    dispatch({ type: "SET_PROGRESS", progress: 50 });

    // 2. Send only metadata + storage path to the API route (tiny payload)
    const response = await fetch("/api/process-informe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        informeId,
        browserTranscript: transcriptToUse,
        language: locale,
        audioPath: storagePath,
        ...(recordingDuration != null && { recordingDuration }),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Error del servidor (${response.status})`);
    }
    result = await response.json();
  } catch (fetchErr) {
    Sentry.captureException(fetchErr, {
      tags: { flow: "process-informe-client" },
      extra: { informeId },
    });
    result = { error: fetchErr instanceof Error ? fetchErr.message : "Error de red" };
  }
  dispatch({ type: "SET_PROGRESS", progress: 100 });

  if (result.transcriptionFailed) {
    dispatch({ type: "SET_PHASE", phase: "transcription_failed" });
    toast.warning(t("transcriptionFailedTitle"), { description: t("transcriptionFailedDescription") });
  } else if (result.insufficientContent) {
    dispatch({ type: "SET_PHASE", phase: "insufficient_content" });
    toast.warning(t("insufficientContentTitle"), { description: t("insufficientContentDescription") });
  } else if (result.error) {
    Sentry.captureMessage(result.error, {
      level: "error",
      tags: { flow: "process-informe-client" },
      extra: { informeId },
    });
    dispatch({ type: "SET_ERROR", error: result.error });
    dispatch({ type: "SET_PHASE", phase: "error" });
    toast.error(t("errorProcess"), { description: result.error });
  } else {
    dispatch({ type: "SET_PHASE", phase: "done" });
    toast.success(t("successTitle"), { description: t("successDescription") });
    const url = tab ? `/informes/${informeId}?tab=${tab}` : `/informes/${informeId}`;
    setTimeout(() => router.push(url), 1200);
  }
}
