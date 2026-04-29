"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { useSpeechRecognitionSetup } from "@/components/audio-recorder/use-speech-recognition";
import type { Action } from "./state";

interface UseRecordingArgs {
  dispatch: React.Dispatch<Action>;
  onMicError: (message: string) => void;
}

interface UseRecordingResult {
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => Promise<void>;
  stopRecording: () => string;
  cleanup: () => void;
}

export function useRecording({ dispatch, onMicError }: UseRecordingArgs): UseRecordingResult {
  const locale = useLocale();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fullTranscriptRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
  }, [dispatch, stopTimer]);

  const liveTranscriptDispatch = useCallback(
    (action: { type: "SET_TRANSCRIPT"; transcript: string } | { type: string }) => {
      if (action.type === "SET_TRANSCRIPT") {
        const a = action as { type: "SET_TRANSCRIPT"; transcript: string };
        dispatch({ type: "SET_LIVE_TRANSCRIPT", transcript: a.transcript });
      }
    },
    [dispatch],
  );

  const setupSpeechRecognition = useSpeechRecognitionSetup({
    locale,
    mediaRecorderRef,
    fullTranscriptRef,
    /* v8 ignore next */
    dispatch: liveTranscriptDispatch as never,
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      fullTranscriptRef.current = "";

      mediaRecorder.start(1000);
      dispatch({ type: "START_RECORDING" });
      startTimer();

      const recognition = setupSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
        } catch {
          /* v8 ignore next */
        }
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { flow: "dictar-pedidos-mic" } });
      const isPermissionDenied =
        err instanceof DOMException && err.name === "NotAllowedError";
      onMicError(
        isPermissionDenied
          ? "Permiso de micrófono denegado"
          : err instanceof Error
            ? err.message
            : "No se pudo acceder al micrófono",
      );
    }
  }, [dispatch, onMicError, setupSpeechRecognition, startTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      recognitionRef.current?.stop();
      stopTimer();
      dispatch({ type: "PAUSE_RECORDING" });
    }
  }, [dispatch, stopTimer]);

  const resumeRecording = useCallback(async () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      startTimer();
      dispatch({ type: "RESUME_RECORDING" });
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          /* v8 ignore next */
        }
      }
    }
  }, [dispatch, startTimer]);

  const cleanup = useCallback(() => {
    stopTimer();
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, [stopTimer]);

  const stopRecording = useCallback(() => {
    const transcript = fullTranscriptRef.current.trim();
    cleanup();
    return transcript;
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { startRecording, pauseRecording, resumeRecording, stopRecording, cleanup };
}
