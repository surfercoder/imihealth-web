"use client";

import { useState, useTransition } from "react";
import { User, Pencil, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown-editor";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";
import { updateInformePacienteWithPdf } from "@/actions/informes";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MarkdownDisplay } from "./markdown-display";
import { WhatsAppIconButton } from "./whatsapp-icon-button";
import { ViewPdfIconButton } from "./view-pdf-icon-button";
import { CertificadoIconButton } from "./certificado-icon-button";
import { PedidosIconButton } from "./pedidos-icon-button";
import { PatientEmailIconButton } from "./patient-email-icon-button";

export function PatientReportCard({
  informeId,
  informePaciente,
  informeDoctor,
  patientName,
  patientEmail,
  pdfUrl,
  whatsappPhone,
  doctorName,
}: {
  informeId: string;
  informePaciente: string;
  informeDoctor: string;
  patientName?: string;
  patientEmail?: string | null;
  pdfUrl?: string | null;
  whatsappPhone?: string;
  doctorName?: string;
}) {
  const t = useTranslations("informeEditor");
  const [isEditing, setIsEditing] = useState(false);
  // eslint-disable-next-line react-doctor/rerender-state-only-in-handlers -- read transitively via pacienteText
  const [edited, setEdited] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const pacienteText = edited ?? informePaciente;

  function handleEdit() {
    setEdited(informePaciente);
    setIsEditing(true);
  }

  function handleCancel() {
    setEdited(null);
    setIsEditing(false);
  }

  function handleSave() {
    startSaving(async () => {
      const result = await updateInformePacienteWithPdf(informeId, pacienteText);
      if ("error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("saveSuccessPdf"));
        setEdited(null);
        setIsEditing(false);
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-center gap-3 border-b bg-emerald-50/50 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
          <User className="size-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-base text-card-foreground">{t("patientReport")}</p>
          <p className="text-xs text-muted-foreground">{t("viaWhatsApp")}</p>
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
                    <Button variant="ghost" size="sm" onClick={handleEdit} aria-label={t("editReport")} className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50">
                      <Pencil className="size-6 text-emerald-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t("editReport")}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {pdfUrl && <ViewPdfIconButton pdfUrl={pdfUrl} />}
              {patientEmail && patientName && doctorName && (
                <PatientEmailIconButton
                  email={patientEmail}
                  patientName={patientName}
                  doctorName={doctorName}
                  reportContent={pacienteText}
                />
              )}
              {whatsappPhone && patientName && (
                <WhatsAppIconButton phone={whatsappPhone} patientName={patientName} informeId={informeId} />
              )}
              {whatsappPhone && patientName && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <CertificadoIconButton informeId={informeId} patientName={patientName} phone={whatsappPhone} informeDoctor={informeDoctor} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{t("createCertificate")}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {whatsappPhone && patientName && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <PedidosIconButton informeId={informeId} informeDoctor={informeDoctor} patientName={patientName} phone={whatsappPhone} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{t("generatePedidos")}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <CopyToClipboardButton text={pacienteText} />
            </>
          )}
        </div>
      </div>
      <div className="p-5 max-h-[600px] overflow-y-auto">
        {isEditing ? (
          <MarkdownEditor
            value={pacienteText}
            onChange={(md) => setEdited(md)}
            disabled={isSaving}
            ariaLabel={t("patientReportPlaceholder")}
            className="focus-within:ring-emerald-500/50"
          />
        ) : (
          <div className="min-h-[40px]">
            {pacienteText ? (
              <>
                <MarkdownDisplay text={pacienteText} />
                {patientName && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <p className="font-semibold text-emerald-700">{t("consentLabel")}</p>
                    <p className="mt-1 text-sm">{t("consentTextImplicit", { patientName })}</p>
                  </div>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">{t("noContent")}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
