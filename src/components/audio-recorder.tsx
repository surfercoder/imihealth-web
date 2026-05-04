"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useTranslations } from "next-intl";
import { useAudioRecording } from "@/components/audio-recorder/use-audio-recording";
import { useProcessingStep } from "@/components/audio-recorder/recorder-state";
import { RecorderStatusDisplay } from "@/components/audio-recorder/recorder-status-display";
import { RecorderControls } from "@/components/audio-recorder/recorder-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AudioRecorderProps {
  informeId: string;
  doctorId: string;
  isQuickReport?: boolean;
  onQuickReportComplete?: (informeRapidoId: string) => void;
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

  const [showConfirmStop, setShowConfirmStop] = useState(false);
  const wasRecordingBeforeConfirm = useRef(false);

  const handleStopRequest = useCallback(() => {
    wasRecordingBeforeConfirm.current = state.phase === "recording";
    if (wasRecordingBeforeConfirm.current) {
      pauseRecording();
    }
    setShowConfirmStop(true);
  }, [state.phase, pauseRecording]);

  const handleCancelStop = useCallback(() => {
    setShowConfirmStop(false);
    if (wasRecordingBeforeConfirm.current) {
      resumeRecording();
    }
  }, [resumeRecording]);

  const handleConfirmStop = useCallback(() => {
    setShowConfirmStop(false);
    stopAndProcess();
  }, [stopAndProcess]);

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
        onStop={handleStopRequest}
        onRetry={handleRetry}
      />

      <Dialog
        open={showConfirmStop}
        onOpenChange={(open) => {
          if (!open) handleCancelStop();
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("confirmStopTitle")}</DialogTitle>
            <DialogDescription>{t("confirmStopDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelStop}>
              {t("confirmStopNo")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmStop}>
              {t("confirmStopYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
