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
  const durationRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Wake Lock request failed (e.g. low battery) — non-critical, continue recording
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  // Keep the ref in sync with state so stopAndProcess can read it without
  // depending on the whole state object (avoids React Compiler memoisation issues).
  useEffect(() => {
    durationRef.current = state.duration;
  }, [state.duration]);

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
      await requestWakeLock();

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
  }, [startTimer, setupSpeechRecognition, requestWakeLock, t]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      recognitionRef.current?.stop();
      stopTimer();
      releaseWakeLock();
      dispatch({ type: "SET_PHASE", phase: "paused" });
    }
  }, [stopTimer, releaseWakeLock]);

  const resumeRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      dispatch({ type: "SET_PHASE", phase: "recording" });
      await requestWakeLock();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
        }
      }
    }
  }, [startTimer, requestWakeLock]);

  const stopAndProcess = useCallback(async () => {
    stopTimer();

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    releaseWakeLock();

    const finalTranscript = fullTranscriptRef.current.trim();
    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";

    const recordingDuration = durationRef.current;

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
    releaseWakeLock,
    informeId,
    doctorId,
    router,
    t,
    locale,
    currentTab,
    isQuickReport,
    onQuickReportComplete,
  ]);

  // Re-acquire wake lock when tab becomes visible again (browser releases it on hide)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        mediaRecorderRef.current?.state === "recording"
      ) {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requestWakeLock]);

  useEffect(() => {
    return () => {
      stopTimer();
      releaseWakeLock();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [stopTimer, releaseWakeLock]);

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
