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
  const seen = new Map<string, number>();

  return (
    <div className="text-sm leading-relaxed space-y-0.5">
      {lines.map((raw) => {
        const trimmed = raw.trim();
        const base = trimmed || "blank";
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const key = count === 0 ? base : `${base}-${count}`;

        if (!trimmed) {
          return <div key={key} className="h-2" />;
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
          return (
            <p key={key} className="font-semibold text-card-foreground mt-3 first:mt-0">
              {clean}
            </p>
          );
        }

        return (
          <p key={key} className="text-card-foreground">
            {clean}
          </p>
        );
      })}
    </div>
  );
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
  const [editedDoctor, setEditedDoctor] = useState<string | null>(null);
  const [editedPaciente, setEditedPaciente] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isRegenerating, startRegenerating] = useTransition();

  const doctorText = editedDoctor ?? informeDoctor;
  const pacienteText = editedPaciente ?? informePaciente;
  const isDirty = doctorText !== informeDoctor || pacienteText !== informePaciente;

  function handleEdit() {
    setEditedDoctor(informeDoctor);
    setEditedPaciente(informePaciente);
    setIsEditing(true);
  }

  function handleCancel() {
    setEditedDoctor(null);
    setEditedPaciente(null);
    setIsEditing(false);
  }

  function handleSave() {
    startSaving(async () => {
      const result = await updateInformeReports(informeId, doctorText, pacienteText);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("saveSuccess"));
        setEditedDoctor(null);
        setEditedPaciente(null);
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
        setEditedDoctor(null);
        setEditedPaciente(null);
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
            onClick={handleEdit}
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
                onChange={(e) => setEditedDoctor(e.target.value)}
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
          <div className="flex items-center gap-3 border-b bg-emerald-50/50 px-5 py-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
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
                onChange={(e) => setEditedPaciente(e.target.value)}
                disabled={isLoading}
                className="min-h-[320px] resize-y text-sm leading-relaxed bg-background/50 border-border/60 focus-visible:ring-emerald-500/50 font-mono"
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
