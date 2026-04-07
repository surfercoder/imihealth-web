"use client";

import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import imiBotListening from "@/../public/assets/images/imi-bot-listening.webp";
import { formatDuration, type RecorderPhase } from "./recorder-state";

interface RecorderStatusDisplayProps {
  phase: RecorderPhase;
  error: string | null;
  duration: number;
  isActive: boolean;
  isPaused: boolean;
  isProcessing: boolean;
}

export function RecorderStatusDisplay({ phase, error, duration, isActive, isPaused, isProcessing }: RecorderStatusDisplayProps) {
  const t = useTranslations("audioRecorder");
  return (
    <div className="relative flex flex-col items-center justify-center transition-all duration-300">
      {isActive && (
        <span className="absolute top-4 right-4 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-destructive" />
        </span>
      )}

      <div className="relative mb-0 flex items-center justify-center">
        <div
          className={cn(
            "relative flex items-center justify-center transition-all duration-300"
          )}
          style={isActive ? { animation: "scale-pulse 2s ease-in-out infinite" } : undefined}
        >
          {phase === "done" ? (
            <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-9" />
            </div>
          ) : phase === "insufficient_content" || phase === "transcription_failed" ? (
            <div className="flex size-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertCircle className="size-9" />
            </div>
          ) : phase === "error" ? (
            <div className="flex size-20 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <AlertCircle className="size-9" />
            </div>
          ) : isProcessing ? (
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="size-9 animate-spin" />
            </div>
          ) : (isActive || isPaused) ? (
            <Image
              src={imiBotListening}
              alt="IMI Bot Listening"
              width={192}
              height={192}
              className="size-48"
              priority
            />
          ) : null}
        </div>
      </div>

      <div className="text-center">
        {phase === "requesting" && (
          <p className="text-sm text-muted-foreground">{t("stateRequesting")}</p>
        )}
        {isActive && (
          <>
            <p className="text-2xl font-mono font-semibold tabular-nums text-destructive tracking-wider">
              {formatDuration(duration)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("stateRecording")}</p>
          </>
        )}
        {isPaused && (
          <>
            <p className="text-2xl font-mono font-semibold tabular-nums text-primary tracking-wider">
              {formatDuration(duration)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("statePaused")}</p>
          </>
        )}
        {phase === "stopped" && (
          <p className="text-sm text-muted-foreground">{t("stateStopped")}</p>
        )}
        {phase === "uploading" && (
          <p className="text-sm text-muted-foreground">{t("stateUploading")}</p>
        )}
        {phase === "transcribing" && (
          <p className="text-sm text-muted-foreground">{t("stateTranscribing")}</p>
        )}
        {phase === "processing" && (
          <p className="text-sm text-muted-foreground">{t("stateProcessing")}</p>
        )}
        {phase === "done" && (
          <>
            <p className="text-base font-medium text-emerald-600">{t("stateDone")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("stateRedirecting")}</p>
          </>
        )}
        {phase === "transcription_failed" && (
          <>
            <p className="text-base font-medium text-amber-600">{t("stateTranscriptionFailed")}</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">{t("stateTranscriptionFailedHint")}</p>
          </>
        )}
        {phase === "insufficient_content" && (
          <>
            <p className="text-base font-medium text-amber-600">{t("stateInsufficientContent")}</p>
            <p className="mt-2 text-sm text-muted-foreground max-w-sm">{t("stateInsufficientContentHint")}</p>
          </>
        )}
        {phase === "error" && (
          <>
            <p className="text-base font-medium text-destructive">{t("stateError")}</p>
            {error && <p className="mt-1 text-sm text-destructive/80">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
