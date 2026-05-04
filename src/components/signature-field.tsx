"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

interface SignatureFieldProps {
  onChange: (dataUrl: string) => void;
  error?: string;
}

export function SignatureField({ onChange, error }: SignatureFieldProps) {
  const t = useTranslations("signatureField");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    /* v8 ignore next -- ref is always set after mount */
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      penColor: "#1E293B",
      backgroundColor: "rgb(255, 255, 255)",
    });
    padRef.current = pad;

    const resizeCanvas = () => {
      /* v8 ignore next -- devicePixelRatio always defined in browsers */
      const ratio = Math.max(window.devicePixelRatio ?? 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      /* v8 ignore next -- getContext always returns non-null for 2d */
      canvas.getContext("2d")?.scale(ratio, ratio);
      pad.clear();
    };

    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      pad.off();
    };
  }, []);

  const handleEnd = useCallback(() => {
    const pad = padRef.current;
    /* v8 ignore next -- pad is always set after mount */
    if (!pad || pad.isEmpty()) return;
    setHasSignature(true);
    onChange(pad.toDataURL("image/png"));
  }, [onChange]);

  // eslint-disable-next-line react-doctor/advanced-event-handler-refs -- SignaturePad's addEventListener requires a stable reference; handleEnd is wrapped in useCallback for that purpose
  useEffect(() => {
    const pad = padRef.current;
    /* v8 ignore next -- pad is always set after mount */
    if (!pad) return;
    pad.addEventListener("endStroke", handleEnd);
    return () => {
      pad.removeEventListener("endStroke", handleEnd);
    };
  }, [handleEnd]);

  const handleClear = useCallback(() => {
    padRef.current?.clear();
    setHasSignature(false);
    onChange("");
  }, [onChange]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium leading-none">{t("label")}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleClear}
        >
          <RotateCcw className="size-3" />
          {t("clear")}
        </Button>
      </div>
      <div
        className={
          "relative overflow-hidden rounded-md border bg-white" +
          (error ? " border-destructive" : " border-input")
        }
        style={{ height: "9rem" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ touchAction: "none" }}
        />
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm select-none"
          style={{ color: "#c0b8d8", opacity: hasSignature ? 0 : 1 }}
        >
          {t("placeholder")}
        </span>
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}
