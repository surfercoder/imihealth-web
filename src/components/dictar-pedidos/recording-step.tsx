"use client";

import { Mic, Pause, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDuration } from "@/components/audio-recorder/recorder-state";
import { InstructionsCard } from "./instructions-card";
import type { Phase } from "./state";

interface RecordingStepProps {
  phase: Phase;
  duration: number;
  liveTranscript: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function RecordingStep({
  phase,
  duration,
  liveTranscript,
  onStart,
  onPause,
  onResume,
  onStop,
}: RecordingStepProps) {
  const t = useTranslations("dictarPedidos");
  const isIdle = phase === "idle";
  const isRecording = phase === "recording";
  const isPaused = phase === "paused";

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col items-center justify-center gap-3 py-4">
        {(isRecording || isPaused) && (
          <p
            className={`text-2xl font-mono font-semibold tabular-nums tracking-wider ${
              isRecording ? "text-destructive" : "text-primary"
            }`}
          >
            {formatDuration(duration)}
          </p>
        )}
        <div className="flex items-center justify-center gap-4">
          {isIdle && (
            <button
              onClick={onStart}
              className="relative flex size-20 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
              aria-label={t("btnStart")}
            >
              <Mic className="size-9" />
            </button>
          )}
          {isRecording && (
            <>
              <button
                onClick={onPause}
                className="relative flex size-14 items-center justify-center rounded-lg bg-white border-2 border-zinc-300 text-zinc-700 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                aria-label={t("btnPause")}
              >
                <Pause className="size-6" />
              </button>
              <button
                onClick={onStop}
                className="relative flex size-20 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                aria-label={t("btnStop")}
              >
                <Square className="size-8" fill="white" />
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button
                onClick={onResume}
                className="relative flex size-14 items-center justify-center rounded-lg bg-white border-2 border-zinc-300 text-zinc-700 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                aria-label={t("btnResume")}
              >
                <Mic className="size-6" />
              </button>
              <button
                onClick={onStop}
                className="relative flex size-20 items-center justify-center rounded-full bg-destructive text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                aria-label={t("btnStop")}
              >
                <Square className="size-8" fill="white" />
              </button>
            </>
          )}
        </div>
        {isIdle && (
          <p className="text-sm text-muted-foreground">{t("idleHint")}</p>
        )}
        {isRecording && (
          <p className="text-sm text-muted-foreground">{t("recordingHint")}</p>
        )}
        {isPaused && (
          <p className="text-sm text-muted-foreground">{t("pausedHint")}</p>
        )}
      </div>

      {(isRecording || isPaused) && liveTranscript && (
        <div className="rounded-lg border border-border bg-muted p-4 max-h-32 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("liveTranscript")}
          </p>
          <p className="text-sm leading-relaxed text-card-foreground">
            {liveTranscript}
          </p>
        </div>
      )}

      <InstructionsCard />
    </div>
  );
}
