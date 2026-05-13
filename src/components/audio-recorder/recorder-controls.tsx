"use client";

import { Button } from "@/components/ui/button";
import { Mic, MicOff, Square, Pause, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RecorderPhase } from "./recorder-state";

interface RecorderControlsProps {
  phase: RecorderPhase;
  isActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetry: () => void;
}

export function RecorderControls({ phase, isActive, isPaused, onStart, onPause, onResume, onStop, onRetry }: RecorderControlsProps) {
  const t = useTranslations("audioRecorder");
  return (
    <div className="flex gap-4 justify-center items-center">
      {phase === "idle" && (
        <button
          onClick={onStart}
          className="relative flex size-24 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
          aria-label={t("btnStart")}
        >
          <Mic className="size-10" />
        </button>
      )}
      {phase === "requesting" && (
        <button
          disabled
          className="relative flex size-24 items-center justify-center rounded-full bg-destructive/50 text-white shadow-lg"
          aria-label={t("btnRequesting")}
        >
          <Loader2 className="size-10 animate-spin" />
        </button>
      )}
      {isActive && (
        <>
          <button
            onClick={onPause}
            className="relative flex size-16 items-center justify-center rounded-lg bg-white border-2 border-zinc-300 text-zinc-700 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
            aria-label={t("btnPause")}
          >
            <Pause className="size-7" />
          </button>
          <button
            onClick={onStop}
            className="relative flex size-24 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
            aria-label={t("btnStop")}
          >
            <Square className="size-10" fill="white" />
          </button>
        </>
      )}
      {isPaused && (
        <>
          <button
            onClick={onResume}
            className="relative flex size-16 items-center justify-center rounded-lg bg-white border-2 border-zinc-300 text-zinc-700 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
            aria-label={t("btnResume")}
          >
            <Mic className="size-7" />
          </button>
          <button
            onClick={onStop}
            className="relative flex size-24 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
            aria-label={t("btnStop")}
          >
            <Square className="size-10" fill="white" />
          </button>
        </>
      )}
      {(phase === "insufficient_content" || phase === "transcription_failed") && (
        <Button size="lg" variant="default" onClick={onRetry} className="gap-2">
          <Mic className="size-4" />
          {t("btnTryAgain")}
        </Button>
      )}
      {phase === "error" && (
        <Button size="lg" variant="outline" onClick={onRetry} className="gap-2">
          <MicOff className="size-4" />
          {t("btnRetry")}
        </Button>
      )}
    </div>
  );
}
