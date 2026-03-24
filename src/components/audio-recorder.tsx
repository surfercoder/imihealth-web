"use client";

import { useReducer, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Mic, MicOff, Square, Play, Pause, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { processInformeFromTranscript } from "@/actions/informes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";

interface AudioRecorderProps {
  informeId: string;
  doctorId: string;
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
  | "error";

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
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 p-10 transition-all duration-300",
        isActive && "border-destructive/50 bg-destructive/5",
        isPaused && "border-primary/40 bg-primary/5",
        phase === "idle" && "border-dashed border-border bg-muted",
        phase === "done" && "border-emerald-300 bg-emerald-50",
        phase === "error" && "border-destructive/50 bg-destructive/5",
        isProcessing && "border-primary/40 bg-primary/5"
      )}
    >
      {isActive && (
        <span className="absolute top-4 right-4 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-destructive" />
        </span>
      )}

      <div className="relative mb-4 flex items-center justify-center">
        {isActive && (
          <span
            className="absolute size-20 rounded-full bg-destructive/20"
            style={{ animation: "pulse-ring 1.5s ease-in-out infinite" }}
          />
        )}
        <div
          className={cn(
            "relative flex size-20 items-center justify-center rounded-full transition-all duration-300",
            isActive && "bg-destructive/15 text-destructive",
            isPaused && "bg-primary/10 text-primary",
            phase === "idle" && "bg-secondary text-muted-foreground",
            phase === "done" && "bg-emerald-100 text-emerald-600",
            phase === "error" && "bg-destructive/15 text-destructive",
            isProcessing && "bg-primary/10 text-primary"
          )}
        >
          {phase === "done" ? (
            <CheckCircle2 className="size-9" />
          ) : phase === "error" ? (
            <AlertCircle className="size-9" />
          ) : isProcessing ? (
            <Loader2 className="size-9 animate-spin" />
          ) : isActive ? (
            <Mic className="size-9" />
          ) : isPaused ? (
            <Pause className="size-9" />
          ) : (
            <Mic className="size-9" />
          )}
        </div>
      </div>

      {isActive && (
        <div className="mb-4 flex items-end justify-center gap-[3px] h-8">
          {[
            { id: "b0", bar: 1 },
            { id: "b1", bar: 2 },
            { id: "b2", bar: 3 },
            { id: "b3", bar: 4 },
            { id: "b4", bar: 5 },
            { id: "b5", bar: 4 },
            { id: "b6", bar: 3 },
            { id: "b7", bar: 2 },
            { id: "b8", bar: 1 },
          ].map(({ id, bar }, i) => (
            <span
              key={id}
              className="w-[4px] rounded-full bg-destructive/70"
              style={{
                animation: `equalizer-bar-${bar} ${0.6 + bar * 0.15}s ease-in-out infinite`,
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="text-center">
        {phase === "idle" && (
          <>
            <p className="text-base font-medium text-card-foreground">{t("stateIdle")}</p>
            <p className="mt-1 text-sm text-card-foreground/60">{t("stateIdleHint")}</p>
          </>
        )}
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
) {
  dispatch({ type: "SET_PHASE", phase: "uploading" });
  dispatch({ type: "SET_PROGRESS", progress: 20 });

  const blob = new Blob(chunks, { type: mimeType });
  let audioPath: string | undefined;

  try {
    const supabase = createClient();
    const ext = blob.type.includes("ogg") ? "ogg" : blob.type.includes("mp4") ? "m4a" : "webm";
    const fileName = `${doctorId}/${informeId}/recording.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("audio-recordings")
      .upload(fileName, blob, { contentType: blob.type, upsert: true });
    if (!uploadError) audioPath = fileName;
  } catch (uploadErr) {
    console.warn("Audio upload failed, continuing without it:", uploadErr);
  }

  dispatch({ type: "SET_PROGRESS", progress: 30 });
  dispatch({ type: "SET_PHASE", phase: "transcribing" });

  const transcriptToUse = finalTranscript || fallbackText;
  dispatch({ type: "SET_PROGRESS", progress: 50 });

  const result = await processInformeFromTranscript(informeId, transcriptToUse, audioPath, locale);
  dispatch({ type: "SET_PROGRESS", progress: 100 });

  if (result.error) {
    dispatch({ type: "SET_ERROR", error: result.error });
    dispatch({ type: "SET_PHASE", phase: "error" });
    toast.error(t("errorProcess"), { description: result.error });
  } else {
    dispatch({ type: "SET_PHASE", phase: "done" });
    toast.success(t("successTitle"), { description: t("successDescription") });
    setTimeout(() => router.push(`/informes/${informeId}`), 1200);
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
    <div className="flex gap-3 justify-center">
      {phase === "idle" && (
        <Button size="lg" onClick={onStart} className="gap-2 px-8">
          <Mic className="size-4" />
          {t("btnStart")}
        </Button>
      )}
      {phase === "requesting" && (
        <Button size="lg" disabled className="gap-2 px-8">
          <Loader2 className="size-4 animate-spin" />
          {t("btnRequesting")}
        </Button>
      )}
      {isActive && (
        <>
          <Button size="lg" variant="outline" onClick={onPause} className="gap-2">
            <Pause className="size-4" />
            {t("btnPause")}
          </Button>
          <Button size="lg" onClick={onStop} className="gap-2 px-8">
            <Square className="size-4" />
            {t("btnStop")}
          </Button>
        </>
      )}
      {isPaused && (
        <>
          <Button size="lg" variant="outline" onClick={onResume} className="gap-2">
            <Play className="size-4" />
            {t("btnResume")}
          </Button>
          <Button size="lg" onClick={onStop} className="gap-2 px-8">
            <Square className="size-4" />
            {t("btnStop")}
          </Button>
        </>
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

export function AudioRecorder({ informeId, doctorId }: AudioRecorderProps) {
  const t = useTranslations("audioRecorder");
  const locale = useLocale();
  const router = useRouter();
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
      uploadAndProcess(dispatch, chunksRef.current, mimeType, doctorId, informeId, finalTranscript, t("transcriptFallback"), t, router, locale);

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
  }, [stopTimer, informeId, doctorId, router, t, locale]);

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
    <div className="space-y-6">
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

      {(isActive || isPaused) && transcript && (
        <div className="rounded-lg border border-border bg-muted p-4 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            {t("liveTranscript")}
          </p>
          <p className="text-sm leading-relaxed text-card-foreground">{transcript}</p>
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
    </div>
  );
}
