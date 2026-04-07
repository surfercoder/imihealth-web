"use client";

import React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
  onQuickReportComplete?: (informeDoctor: string) => void,
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

    const result = await processQuickInforme(transcriptToUse, blob, locale);
    dispatch({ type: "SET_PROGRESS", progress: 100 });

    if (result.error) {
      dispatch({ type: "SET_ERROR", error: result.error });
      dispatch({ type: "SET_PHASE", phase: "error" });
      toast.error(t("errorProcess"), { description: result.error });
    } else if (result.informeDoctor) {
      dispatch({ type: "SET_PHASE", phase: "done" });
      toast.success(t("successTitle"), { description: t("successDescription") });
      // Hand the report back to the parent so it can swap to the result view
      // in-place. We deliberately avoid passing report content via the URL
      // because reports can easily exceed URL-length limits and break
      // decodeURIComponent on certain characters.
      const informeDoctor = result.informeDoctor;
      setTimeout(() => onQuickReportComplete?.(informeDoctor), 1200);
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

  // Classic report flow - send audio via API route (FormData) to avoid
  // React Flight serialisation limits on large payloads.
  dispatch({ type: "SET_PROGRESS", progress: 30 });
  dispatch({ type: "SET_PHASE", phase: "transcribing" });

  const formData = new FormData();
  formData.append("informeId", informeId);
  formData.append("browserTranscript", transcriptToUse);
  formData.append("language", locale);
  /* v8 ignore next */
  formData.append("audio", blob, `recording.${mimeType.split("/")[1]?.split(";")[0] || "webm"}`);

  dispatch({ type: "SET_PROGRESS", progress: 50 });

  let result: { success?: boolean; insufficientContent?: boolean; transcriptionFailed?: boolean; error?: string };
  try {
    const response = await fetch("/api/process-informe", {
      method: "POST",
      body: formData,
    });
    result = await response.json();
  } catch (fetchErr) {
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
