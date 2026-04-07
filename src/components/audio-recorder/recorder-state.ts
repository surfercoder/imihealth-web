"use client";

import { useEffect, useReducer } from "react";

export type RecorderPhase =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "stopped"
  | "uploading"
  | "transcribing"
  | "processing"
  | "done"
  | "error"
  | "insufficient_content"
  | "transcription_failed";

export interface RecorderState {
  phase: RecorderPhase;
  error: string | null;
  duration: number;
  transcript: string;
  progress: number;
}

export type RecorderAction =
  | { type: "SET_PHASE"; phase: RecorderPhase }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "TICK" }
  | { type: "SET_TRANSCRIPT"; transcript: string }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "RESET" };

export function recorderReducer(state: RecorderState, action: RecorderAction): RecorderState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "TICK":
      return { ...state, duration: state.duration + 1 };
    case "SET_TRANSCRIPT":
      return { ...state, transcript: action.transcript };
    case "SET_PROGRESS":
      return { ...state, progress: action.progress };
    case "RESET":
      return { phase: "idle", error: null, duration: 0, transcript: "", progress: 0 };
  }
}

export const initialRecorderState: RecorderState = {
  phase: "idle",
  error: null,
  duration: 0,
  transcript: "",
  progress: 0,
};

export const stepReducer = (current: number, action: "reset" | "advance"): number =>
  action === "reset" ? 0 : Math.min(current + 1, 3);

export function useProcessingStep(active: boolean): number {
  const [step, dispatch] = useReducer(stepReducer, 0);

  useEffect(() => {
    if (!active) return;
    const tick = () => dispatch("advance");
    const resetId = setTimeout(() => dispatch("reset"), 0);
    const id = setInterval(tick, 15000);
    return () => { clearTimeout(resetId); clearInterval(id); };
  }, [active]);

  return active ? step : 0;
}

export function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
