"use client";

import { Suspense, useReducer, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Square, Pause, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { processInformeFromTranscript } from "@/actions/informes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { useCurrentTab } from "@/hooks/use-current-tab";

interface AudioRecorderProps {
  informeId: string;
  doctorId: string;
  isQuickReport?: boolean;
}

type RecorderPhase =
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
  | "insufficient_content";

interface RecorderState {
  phase: RecorderPhase;
  error: string | null;
  duration: number;
  transcript: string;
  progress: number;
}

type RecorderAction =
  | { type: "SET_PHASE"; phase: RecorderPhase }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "TICK" }
  | { type: "SET_TRANSCRIPT"; transcript: string }
  | { type: "SET_PROGRESS"; progress: number }
  | { type: "RESET" };

function recorderReducer(state: RecorderState, action: RecorderAction): RecorderState {
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

const initialRecorderState: RecorderState = {
  phase: "idle",
  error: null,
  duration: 0,
  transcript: "",
  progress: 0,
};

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function RecorderStatusDisplay({ phase, error, duration, isActive, isPaused, isProcessing }: {
  phase: RecorderPhase;
  error: string | null;
  duration: number;
  isActive: boolean;
  isPaused: boolean;
  isProcessing: boolean;
}) {
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
          ) : phase === "insufficient_content" ? (
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
              src="/assets/images/imi-bot-listening.png"
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

async function uploadAndProcess(
  dispatch: React.Dispatch<RecorderAction>,
  chunks: Blob[],
  mimeType: string,
  doctorId: string,
  informeId: string,
  finalTranscript: string,
  fallbackText: string,
  t: (key: string) => string,
  router: ReturnType<typeof useRouter>,
  locale: string,
  tab?: string | null,
  isQuickReport?: boolean,
) {
  dispatch({ type: "SET_PHASE", phase: "uploading" });
  dispatch({ type: "SET_PROGRESS", progress: 20 });

  const blob = new Blob(chunks, { type: mimeType });
  const transcriptToUse = finalTranscript || fallbackText;

  // For quick reports, skip database storage and use processQuickInforme
  if (isQuickReport) {
    dispatch({ type: "SET_PROGRESS", progress: 30 });
    dispatch({ type: "SET_PHASE", phase: "transcribing" });
    
    const { processQuickInforme } = await import("@/actions/quick-informe");
    
    dispatch({ type: "SET_PROGRESS", progress: 50 });
    dispatch({ type: "SET_PHASE", phase: "processing" });
    
    const result = await processQuickInforme(transcriptToUse, blob, locale);
    dispatch({ type: "SET_PROGRESS", progress: 100 });

    if (result.error) {
      dispatch({ type: "SET_ERROR", error: result.error });
      dispatch({ type: "SET_PHASE", phase: "error" });
      toast.error(t("errorProcess"), { description: result.error });
    } else if (result.informeDoctor) {
      dispatch({ type: "SET_PHASE", phase: "done" });
      toast.success(t("successTitle"), { description: t("successDescription") });
      // Redirect to a result page with the informe in the URL state
      setTimeout(() => {
        router.push(`/quick-informe/result?informe=${encodeURIComponent(result.informeDoctor!)}`);
      }, 1200);
    }
    return;
  }

  // Classic report flow - pass audio directly to server action (no storage)
  dispatch({ type: "SET_PROGRESS", progress: 30 });
  dispatch({ type: "SET_PHASE", phase: "transcribing" });

  // Convert blob to base64 for server action transfer
  let audioBase64: string | undefined;
  let audioContentType: string | undefined;
  try {
    const arrayBuffer = await blob.arrayBuffer();
    audioBase64 = Buffer.from(arrayBuffer).toString("base64");
    audioContentType = blob.type;
  } catch {
    console.warn("Audio encoding failed, continuing without it");
  }

  dispatch({ type: "SET_PROGRESS", progress: 50 });

  const result = await processInformeFromTranscript(informeId, transcriptToUse, audioBase64, audioContentType, locale);
  dispatch({ type: "SET_PROGRESS", progress: 100 });

  if ("insufficientContent" in result && result.insufficientContent) {
    dispatch({ type: "SET_PHASE", phase: "insufficient_content" });
    toast.warning(t("insufficientContentTitle"), { description: t("insufficientContentDescription") });
  } else if (result.error) {
    dispatch({ type: "SET_ERROR", error: result.error });
    dispatch({ type: "SET_PHASE", phase: "error" });
    toast.error(t("errorProcess"), { description: result.error });
  } else {
    dispatch({ type: "SET_PHASE", phase: "done" });
    toast.success(t("successTitle"), { description: t("successDescription") });
    const url = tab ? `/informes/${informeId}?tab=${tab}` : `/informes/${informeId}`;
    setTimeout(() => router.push(url), 1200);
  }
}

function RecorderControls({ phase, isActive, isPaused, onStart, onPause, onResume, onStop, onRetry }: {
  phase: RecorderPhase;
  isActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetry: () => void;
}) {
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
            className="relative flex size-16 items-center justify-center rounded-lg bg-white border-2 border-gray-300 text-gray-700 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
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
            className="relative flex size-16 items-center justify-center rounded-lg bg-white border-2 border-gray-300 text-gray-700 shadow-md transition-all hover:scale-105 hover:shadow-lg active:scale-95"
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
      {phase === "insufficient_content" && (
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

function AudioRecorderContent({ informeId, doctorId, isQuickReport }: AudioRecorderProps) {
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

  const setupSpeechRecognition = useCallback(() => {
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
  }, [locale]);

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

    const process = () =>
      uploadAndProcess(dispatch, chunksRef.current, mimeType, doctorId, informeId, finalTranscript, t("transcriptFallback"), t, router, locale, currentTab, isQuickReport);

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
  }, [stopTimer, informeId, doctorId, router, t, locale, currentTab, isQuickReport]);

  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, [stopTimer]);

  const { phase, error, duration, transcript, progress } = state;
  const isProcessing = ["uploading", "transcribing", "processing", "stopped"].includes(phase);
  const isActive = phase === "recording";
  const isPaused = phase === "paused";

  /* v8 ignore next 8 */
  const progressLabel =
    progress < 30
      ? t("progressUploading")
      : progress < 50
      ? t("progressTranscribing")
      : progress < 80
      ? t("progressAnalyzing")
      : t("progressGenerating");

  const handleRetry = useCallback(() => {
    dispatch({ type: "RESET" });
    fullTranscriptRef.current = "";
    chunksRef.current = [];
  }, []);

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
          <Progress value={progress} className="h-1.5" />
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
