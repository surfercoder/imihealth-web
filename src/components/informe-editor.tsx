"use client";

import { useState, useTransition } from "react";
import { Stethoscope, MessageCircle, Pencil, X, Save, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";
import { updateInformeReports, regenerateReportFromEdits } from "@/actions/informes";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function MarkdownDisplay({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    const isHeader =
      trimmed.startsWith("#") ||
      (trimmed.endsWith(":") && trimmed === trimmed.toUpperCase()) ||
      /^\*\*[^*]+\*\*:?\s*$/.test(trimmed);

    const clean = raw
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

    if (isHeader) {
      elements.push(
        <p key={i} className="font-semibold text-card-foreground mt-3 first:mt-0">
          {clean}
        </p>
      );
    } else {
      elements.push(
        <p key={i} className="text-card-foreground">
          {clean}
        </p>
      );
    }
    i++;
  }

  return <div className="text-sm leading-relaxed space-y-0.5">{elements}</div>;
}

interface InformeEditorProps {
  informeId: string;
  informeDoctor: string;
  informePaciente: string;
  hasTranscript: boolean;
  patientConsent?: boolean;
  patientConsentAt?: string | null;
  patientName?: string;
}

export function InformeEditor({
  informeId,
  informeDoctor,
  informePaciente,
  hasTranscript,
  patientConsent,
  patientConsentAt,
  patientName,
}: InformeEditorProps) {
  const t = useTranslations("informeEditor");
  const [isEditing, setIsEditing] = useState(false);
  const [doctorText, setDoctorText] = useState(informeDoctor);
  const [pacienteText, setPacienteText] = useState(informePaciente);
  const [isSaving, startSaving] = useTransition();
  const [isRegenerating, startRegenerating] = useTransition();

  const isDirty = doctorText !== informeDoctor || pacienteText !== informePaciente;

  function handleCancel() {
    setDoctorText(informeDoctor);
    setPacienteText(informePaciente);
    setIsEditing(false);
  }

  function handleSave() {
    startSaving(async () => {
      const result = await updateInformeReports(informeId, doctorText, pacienteText);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("saveSuccess"));
        setIsEditing(false);
      }
    });
  }

  function handleRegenerate() {
    startRegenerating(async () => {
      const result = await regenerateReportFromEdits(informeId, doctorText, pacienteText);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("regenerateSuccess"));
        setIsEditing(false);
      }
    });
  }

  const isLoading = isSaving || isRegenerating;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {isEditing ? (
          <>
            {hasTranscript && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isLoading}
                className="gap-1.5"
              >
                {isRegenerating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {t("regenerate")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="gap-1.5"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              {t("save")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="size-3.5" />
              {t("cancel")}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-1.5"
          >
            <Pencil className="size-3.5" />
            {t("edit")}
          </Button>
        )}
      </div>

      {isEditing && isDirty && !isSaving && !isRegenerating && (
        <p className="text-xs text-muted-foreground text-right -mt-2">
          {t("unsavedChanges")}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b bg-primary/5 px-5 py-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Stethoscope className="size-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-card-foreground">{t("medicalReport")}</p>
              <p className="text-xs text-muted-foreground">{t("forDoctor")}</p>
            </div>
            {!isEditing && (
            <CopyToClipboardButton
              text={
                patientConsent && patientConsentAt && patientName
                  ? `${doctorText}\n\n---\n${t("consentLabel")}\n${t("consentText", { patientName, patientConsentAt })}`
                  : doctorText
              }
            />
          )}
          </div>
          <div className="p-5">
            {isEditing ? (
              <Textarea
                value={doctorText}
                onChange={(e) => setDoctorText(e.target.value)}
                disabled={isLoading}
                className="min-h-[320px] resize-y text-sm leading-relaxed bg-background/50 border-border/60 focus-visible:ring-primary/50 font-mono"
                placeholder={t("medicalReportPlaceholder")}
              />
            ) : (
              <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap text-card-foreground">
                {doctorText || t("noContent")}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 border-b bg-accent/5 px-5 py-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <MessageCircle className="size-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-card-foreground">{t("patientReport")}</p>
              <p className="text-xs text-muted-foreground">{t("viaWhatsApp")}</p>
            </div>
            {!isEditing && <CopyToClipboardButton text={pacienteText} />}
          </div>
          <div className="p-5">
            {isEditing ? (
              <Textarea
                value={pacienteText}
                onChange={(e) => setPacienteText(e.target.value)}
                disabled={isLoading}
                className="min-h-[320px] resize-y text-sm leading-relaxed bg-background/50 border-border/60 focus-visible:ring-accent/50 font-mono"
                placeholder={t("patientReportPlaceholder")}
              />
            ) : (
              <div className="min-h-[40px]">
                {pacienteText ? <MarkdownDisplay text={pacienteText} /> : <span className="text-sm text-muted-foreground">{t("noContent")}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
