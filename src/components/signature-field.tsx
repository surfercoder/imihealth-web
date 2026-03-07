"use client";

import { useRef, useCallback, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import type SignatureCanvasType from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

interface SignatureFieldProps {
  onChange: (dataUrl: string) => void;
  error?: string;
}

export function SignatureField({ onChange, error }: SignatureFieldProps) {
  const t = useTranslations("signatureField");
  const sigRef = useRef<SignatureCanvasType | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleEnd = useCallback(() => {
    /* v8 ignore next */
    if (!sigRef.current || sigRef.current.isEmpty()) return;
    setHasSignature(true);
    onChange(sigRef.current.toDataURL("image/png"));
  }, [onChange]);

  const handleClear = useCallback(() => {
    sigRef.current?.clear();
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
        <SignatureCanvas
          ref={sigRef}
          penColor="#1E293B"
          backgroundColor="white"
          canvasProps={{
            className: "absolute inset-0 w-full h-full",
            style: { touchAction: "none" },
          }}
          onEnd={handleEnd}
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
