"use client";

import { Suspense } from "react";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { useAudioRecording } from "@/components/audio-recorder/use-audio-recording";
import { useProcessingStep } from "@/components/audio-recorder/recorder-state";
import { RecorderStatusDisplay } from "@/components/audio-recorder/recorder-status-display";
import { RecorderControls } from "@/components/audio-recorder/recorder-controls";

interface AudioRecorderProps {
  informeId: string;
  doctorId: string;
  isQuickReport?: boolean;
  onQuickReportComplete?: (informeDoctor: string) => void;
}

function AudioRecorderContent({
  informeId,
  doctorId,
  isQuickReport,
  onQuickReportComplete,
}: AudioRecorderProps) {
  const t = useTranslations("audioRecorder");
  const {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndProcess,
    handleRetry,
  } = useAudioRecording({
    informeId,
    doctorId,
    isQuickReport,
    onQuickReportComplete,
  });

  const { phase, error, duration, transcript, progress } = state;
  const isProcessing = ["uploading", "transcribing", "processing", "stopped"].includes(phase);
  const isActive = phase === "recording";
  const isPaused = phase === "paused";

  // Timed progress messages that cycle during processing.
  const processingStep = useProcessingStep(isProcessing);

  const processingMessages = [
    t("progressStep1"),
    t("progressStep2"),
    t("progressStep3"),
    t("progressStep4"),
  ];

  /* v8 ignore next */
  const progressLabel = processingMessages[processingStep] || t("progressStep4");
  /* v8 ignore next */
  const progressValue = isProcessing ? [25, 50, 75, 100][processingStep] ?? 100 : progress;

  return (
    <div className="space-y-2">
      <RecorderStatusDisplay
        phase={phase}
        error={error}
        duration={duration}
        isActive={isActive}
        isPaused={isPaused}
        isProcessing={isProcessing}
      />

      {isProcessing && (
        <div className="space-y-1.5">
          <Progress value={progressValue} className="h-1.5" />
          <p className="text-center text-xs text-muted-foreground">
            {progressLabel}
          </p>
        </div>
      )}

      <RecorderControls
        phase={phase}
        isActive={isActive}
        isPaused={isPaused}
        onStart={startRecording}
        onPause={pauseRecording}
        onResume={resumeRecording}
        onStop={stopAndProcess}
        onRetry={handleRetry}
      />

      {(isActive || isPaused) && transcript && (
        <div className="rounded-lg border border-border bg-muted p-4 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("liveTranscript")}
          </p>
          <p className="text-sm leading-relaxed text-card-foreground">{transcript}</p>
        </div>
      )}
    </div>
  );
}

export function AudioRecorder(props: AudioRecorderProps) {
  return (
    <Suspense fallback={null}>
      <AudioRecorderContent {...props} />
    </Suspense>
  );
}
