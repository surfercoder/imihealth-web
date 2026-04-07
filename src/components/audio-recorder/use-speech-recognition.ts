"use client";

import { useCallback, type Dispatch, type MutableRefObject } from "react";
import type { RecorderAction } from "./recorder-state";

interface UseSpeechRecognitionArgs {
  locale: string;
  mediaRecorderRef: MutableRefObject<MediaRecorder | null>;
  fullTranscriptRef: MutableRefObject<string>;
  dispatch: Dispatch<RecorderAction>;
}

export function useSpeechRecognitionSetup({
  locale,
  mediaRecorderRef,
  fullTranscriptRef,
  dispatch,
}: UseSpeechRecognitionArgs) {
  return useCallback(() => {
    const SpeechRecognitionAPI =
      (typeof window !== "undefined" &&
        (window.SpeechRecognition || window.webkitSpeechRecognition)) ||
      null;

    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    /* v8 ignore next */
    recognition.lang = locale === "en" ? "en-US" : "es-AR";
    recognition.maxAlternatives = 1;

    let interimTranscript = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          fullTranscriptRef.current += result[0].transcript + " ";
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      dispatch({ type: "SET_TRANSCRIPT", transcript: fullTranscriptRef.current + interimTranscript });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        try {
          recognition.start();
        } catch {
        }
      }
    };

    return recognition;
  }, [locale, mediaRecorderRef, fullTranscriptRef, dispatch]);
}
