"use client";

import { Stethoscope } from "lucide-react";
import { useTranslations } from "next-intl";

interface TranscriptMonologueProps {
  transcript: string;
}

export function TranscriptMonologue({ transcript }: TranscriptMonologueProps) {
  const t = useTranslations("transcriptMonologue");
  
  if (!transcript) return null;

  const paragraphs = transcript.split(/\n\n+/).filter(p => p.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Stethoscope className="size-3" />
          </span>
          {t("doctorNarration")}
        </div>
        <span className="text-xs text-muted-foreground">
          {t("monologue")}
        </span>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-4">
          {paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-sm leading-relaxed text-card-foreground"
            >
              {paragraph.trim()}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
