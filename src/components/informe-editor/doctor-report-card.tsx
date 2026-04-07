"use client";

import { useState, useTransition } from "react";
import { Stethoscope, Pencil, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyToClipboardButtonDoctor } from "@/components/copy-to-clipboard-button-doctor";
import { updateInformeDoctorOnly } from "@/actions/informes";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EmailIconButton } from "./email-icon-button";
import { DoctorWhatsAppIconButton } from "./doctor-whatsapp-icon-button";

export function DoctorReportCard({
  informeId,
  informeDoctor,
  patientName,
  doctorName,
  doctorEmail,
  doctorPhone,
}: {
  informeId: string;
  informeDoctor: string;
  patientName?: string;
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
}) {
  const t = useTranslations("informeEditor");
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const doctorText = edited ?? informeDoctor;

  function handleEdit() {
    setEdited(informeDoctor);
    setIsEditing(true);
  }

  function handleCancel() {
    setEdited(null);
    setIsEditing(false);
  }

  function handleSave() {
    startSaving(async () => {
      const result = await updateInformeDoctorOnly(informeId, doctorText);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("saveSuccess"));
        setEdited(null);
        setIsEditing(false);
      }
    });
  }

  const consentText = patientName
    ? `${doctorText}\n\n---\n${t("consentLabel")}\n${t("consentTextImplicit", { patientName })}`
    : doctorText;

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 border-b bg-primary/5 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Stethoscope className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base text-card-foreground">{t("medicalReport")}</p>
          <p className="text-xs text-muted-foreground">{t("forDoctor")}</p>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5 h-7">
                {isSaving ? <Loader2 className="size-6 animate-spin" /> : <Save className="size-6" />}
                {t("save")}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving} className="gap-1.5 text-muted-foreground h-7">
                <X className="size-6" />
              </Button>
            </>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={handleEdit} aria-label={t("editReport")} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted">
                      <Pencil className="size-6" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t("editReport")}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {doctorEmail && doctorName && (
                <EmailIconButton email={doctorEmail} doctorName={doctorName} reportContent={consentText} />
              )}
              {doctorPhone && doctorName && (
                <DoctorWhatsAppIconButton phone={doctorPhone} doctorName={doctorName} reportContent={consentText} />
              )}
              <CopyToClipboardButtonDoctor text={consentText} />
            </>
          )}
        </div>
      </div>
      <div className="p-5 max-h-[600px] overflow-y-auto">
        {isEditing ? (
          <Textarea
            value={doctorText}
            onChange={(e) => setEdited(e.target.value)}
            disabled={isSaving}
            className="min-h-[320px] resize-y text-sm leading-relaxed bg-background/50 border-border/60 focus-visible:ring-primary/50 font-mono"
            placeholder={t("medicalReportPlaceholder")}
          />
        ) : (
          <div className="prose prose-sm max-w-none text-sm leading-relaxed whitespace-pre-wrap text-card-foreground">
            {doctorText || t("noContent")}
            {doctorText && patientName && (
              <>
                {"\n\n---\n"}
                <div className="mt-4 pt-4 border-t border-border/40">
                  <p className="font-semibold">{t("consentLabel")}</p>
                  <p className="mt-1">{t("consentTextImplicit", { patientName })}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
