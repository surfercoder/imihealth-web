"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCurrentTab } from "@/hooks/use-current-tab";
import {
  initialRecorderState,
  recorderReducer,
} from "./recorder-state";
import { uploadAndProcess } from "./upload-and-process";
import { useSpeechRecognitionSetup } from "./use-speech-recognition";

interface UseAudioRecordingArgs {
  informeId: string;
  doctorId: string;
  isQuickReport?: boolean;
  onQuickReportComplete?: (informeRapidoId: string) => void;
}

export function useAudioRecording({
  informeId,
  doctorId,
  isQuickReport,
  onQuickReportComplete,
}: UseAudioRecordingArgs) {
  const t = useTranslations("audioRecorder");
  const locale = useLocale();
  const router = useRouter();
  const currentTab = useCurrentTab();
  const [state, dispatch] = useReducer(recorderReducer, initialRecorderState);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fullTranscriptRef = useRef<string>("");

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
  }, [stopTimer]);

  const setupSpeechRecognition = useSpeechRecognitionSetup({
    locale,
    mediaRecorderRef,
    fullTranscriptRef,
    dispatch,
  });

  const startRecording = useCallback(async () => {
    dispatch({ type: "SET_ERROR", error: null });
    dispatch({ type: "SET_PHASE", phase: "requesting" });

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "audio/ogg";

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(1000);
      dispatch({ type: "SET_PHASE", phase: "recording" });
      startTimer();

      const recognition = setupSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t("errorMicAccess");
      dispatch({
        type: "SET_ERROR",
        error: msg.includes("Permission") ? t("errorMicDenied") : msg,
      });
      dispatch({ type: "SET_PHASE", phase: "error" });
    }
  }, [startTimer, setupSpeechRecognition, t]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      recognitionRef.current?.stop();
      stopTimer();
      dispatch({ type: "SET_PHASE", phase: "paused" });
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      dispatch({ type: "SET_PHASE", phase: "recording" });
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
        }
      }
    }
  }, [startTimer]);

  const stopAndProcess = useCallback(async () => {
    stopTimer();

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    const finalTranscript = fullTranscriptRef.current.trim();
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";

    const recordingDuration = state.duration;

    const process = () =>
      uploadAndProcess(
        dispatch,
        chunksRef.current,
        mimeType,
        doctorId,
        informeId,
        finalTranscript,
        t("transcriptFallback"),
        t,
        router,
        locale,
        currentTab,
        isQuickReport,
        onQuickReportComplete,
        recordingDuration,
      );

    return new Promise<void>((resolve) => {
      /* v8 ignore next 4 */
      if (!mediaRecorderRef.current) {
        resolve();
        return;
      }

      mediaRecorderRef.current.onstop = () => process().then(resolve);

      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        dispatch({ type: "SET_PHASE", phase: "stopped" });
      } else {
        process().then(resolve);
      }
    });
  }, [
    stopTimer,
    informeId,
    doctorId,
    router,
    t,
    locale,
    currentTab,
    isQuickReport,
    onQuickReportComplete,
  ]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [stopTimer]);

  const handleRetry = useCallback(() => {
    dispatch({ type: "RESET" });
    fullTranscriptRef.current = "";
    chunksRef.current = [];
  }, []);

  return {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndProcess,
    handleRetry,
  };
}
