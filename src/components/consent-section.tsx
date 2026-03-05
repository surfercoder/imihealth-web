"use client";

import { useState, useTransition } from "react";
import { CheckSquare, Square, ShieldCheck, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { type DialogTurn } from "@/components/transcript-dialog";
import { TranscriptDialog } from "@/components/transcript-dialog";
import { cn } from "@/lib/utils";
import { recordPatientConsent } from "@/actions/informes";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface ConsentSectionProps {
  informeId: string;
  dialog: DialogTurn[];
  patientName: string;
  informePaciente: string;
  initialConsent: boolean;
  initialConsentAt: string | null;
}

export function ConsentSection({
  informeId,
  dialog,
  patientName,
  informePaciente,
  initialConsent,
  initialConsentAt,
}: ConsentSectionProps) {
  const t = useTranslations("consentSection");
  const [checked, setChecked] = useState(false);
  const [localConsent, setLocalConsent] = useState<{ consented: boolean; consentAt: string | null } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  const consented = localConsent?.consented ?? initialConsent;
  const consentAt = localConsent?.consentAt ?? initialConsentAt;

  function handleCheck() {
    /* v8 ignore next */
    if (consented) return;
    setChecked((v) => !v);
  }

  function handleConfirm() {
    /* v8 ignore next */
    if (!checked || consented || isPending) return;
    startTransition(async () => {
      const result = await recordPatientConsent(informeId);
      if ("error" in result && result.error) {
        toast.error(t("errorToast"), { description: result.error });
      } else if ("success" in result && result.success) {
        setLocalConsent({ consented: true, consentAt: result.consentAt ?? null });
        toast.success(t("successToast"));
      }
    });
  }

  const firstName = patientName.split(" ")[0];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg transition-colors",
            consented ? "bg-accent text-white" : "bg-muted text-muted-foreground"
          )}
        >
          <ShieldCheck className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-card-foreground">{t("title")}</p>
          <p className="text-xs text-muted-foreground">
            {consented
              ? consentAt ? t("grantedAt", { date: consentAt }) : t("granted", { date: "" })
              : t("pending")}
          </p>
        </div>
        {consented && (
          <span className="text-xs font-medium text-white bg-accent rounded-full px-2.5 py-0.5">
            {t("confirmed")}
          </span>
        )}
      </div>

      <div className="px-5 py-5 space-y-4">
        {!consented && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("instructions")}
          </p>
        )}

        {informePaciente && (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm font-medium text-card-foreground">
                {t("previewTitle", { firstName })}
              </span>
              {showPreview ? (
                <ChevronUp className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              )}
            </button>
            {showPreview && (
              <div className="border-t border-border/60 px-4 py-4 bg-muted/50 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t("consultSummary")}
                  </p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-card-foreground">
                    {informePaciente}
                  </p>
                </div>
                {dialog.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {t("dialogTranscript")}
                    </p>
                    <TranscriptDialog dialog={dialog} patientName={patientName} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {consented ? (
          <div className="flex items-start gap-2.5 rounded-lg bg-accent px-4 py-3">
            <ShieldCheck className="size-4 text-white shrink-0 mt-0.5" />
            <p className="text-sm text-white font-medium leading-relaxed">
              {t("consentConfirmedMessage", { firstName })}
              {consentAt && (
                <span className="font-normal text-white/80 ml-1">({consentAt})</span>
              )}
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCheck}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200",
                checked
                  ? "border-accent/40 bg-accent/8 hover:bg-accent/12"
                  : "border-border bg-muted/40 hover:bg-muted/70"
              )}
            >
              <span className="mt-0.5 shrink-0">
                {checked ? (
                  <CheckSquare className="size-5 text-accent" />
                ) : (
                  <Square className="size-5 text-muted-foreground" />
                )}
              </span>
              <span className="text-sm leading-relaxed text-card-foreground">
                {t.rich("consentCheckboxLabel", {
                  patientName,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </span>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!checked || isPending}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all duration-200",
                checked && !isPending
                  ? "border-accent bg-accent text-white hover:bg-accent/90 cursor-pointer shadow-sm"
                  : "border-border bg-muted/40 text-muted-foreground cursor-not-allowed opacity-60"
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  {t("submit")}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
