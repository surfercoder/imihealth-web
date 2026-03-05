"use client";

import { Stethoscope, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export interface DialogTurn {
  speaker: "doctor" | "paciente";
  text: string;
}

interface TranscriptDialogProps {
  dialog: DialogTurn[];
  patientName?: string;
}

export function TranscriptDialog({ dialog, patientName }: TranscriptDialogProps) {
  const t = useTranslations("transcriptDialog");
  if (!dialog || dialog.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Stethoscope className="size-3" />
            </span>
            {t("doctor")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-accent/15 text-accent">
              <User className="size-3" />
            </span>
            {patientName ?? t("patient")}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {t("interventions", { count: dialog.length })}
        </span>
      </div>

      <div className="space-y-3">
        {dialog.map((turn, i) => {
          const isDoctor = turn.speaker === "doctor";
          return (
            <div
              key={i}
              className={cn(
                "flex gap-2.5",
                isDoctor ? "flex-row" : "flex-row-reverse"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                  isDoctor
                    ? "bg-primary/15 text-primary"
                    : "bg-accent/15 text-accent"
                )}
              >
                {isDoctor ? (
                  <Stethoscope className="size-3.5" />
                ) : (
                  <User className="size-3.5" />
                )}
              </div>

              <div
                className={cn(
                  "flex flex-col gap-1 max-w-[78%]",
                  isDoctor ? "items-start" : "items-end"
                )}
              >
                <span className="text-[11px] font-medium text-muted-foreground px-1">
                  {isDoctor ? t("doctor") : (patientName ?? t("patient"))}
                </span>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                    isDoctor
                      ? "rounded-tl-sm bg-primary/10 text-card-foreground border border-primary/15"
                      : "rounded-tr-sm bg-accent/10 text-card-foreground border border-accent/15"
                  )}
                >
                  {turn.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
