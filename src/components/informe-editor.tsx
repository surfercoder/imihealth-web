"use client";

import { useState, useTransition } from "react";
import { Stethoscope, MessageCircle, Pencil, X, Save, Loader2, Eye, Mail } from "lucide-react";
import { WhatsAppOptInButton } from "@/components/whatsapp-opt-in-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyToClipboardButton } from "@/components/copy-to-clipboard-button";
import { CopyToClipboardButtonDoctor } from "@/components/copy-to-clipboard-button-doctor";
import { CertificadoButton } from "@/components/certificado-button";
import { updateInformeDoctorOnly, updateInformePacienteWithPdf } from "@/actions/informes";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function MarkdownDisplay({ text }: { text: string }) {
  const lines = text.split("\n");
  const seen = new Map<string, number>();

  return (
    <div className="text-sm leading-relaxed space-y-0.5">
      {lines.map((raw) => {
        const trimmed = raw.trim();
        const base = trimmed || "blank";
        /* v8 ignore next */
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        /* v8 ignore next */
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

function WhatsAppIconButton({ phone, patientName, informeId }: { phone: string; patientName: string; informeId: string }) {
  const t = useTranslations("whatsappButton");
  const tEditor = useTranslations("informeEditor");
  const locale = useLocale();
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const fallbackError = t("errorMessage");
    setIsSending(true);
    let data: { success?: boolean; error?: string } | null = null;
    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          type: "informe",
          informeId,
          patientName,
          locale,
        }),
      });
      data = await response.json();
    } catch {
      // network error
    }

    if (data && data.success) {
      toast.success(t("successTitle"), {
        description: t("successMessage", { patientName }),
      });
    } else {
      const errorMsg = (data && data.error) ? data.error : fallbackError;
      toast.error(t("errorTitle"), { description: errorMsg });
    }
    setIsSending(false);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSend}
            disabled={isSending}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50"
          >
            {isSending ? (
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            ) : (
              <MessageCircle className="size-6 text-emerald-600" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tEditor("sendWhatsApp")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CertificadoIconButton({ informeId, patientName, phone }: { informeId: string; patientName: string; phone: string }) {
  return (
    <CertificadoButton informeId={informeId} patientName={patientName} phone={phone} iconOnly />
  );
}

function ViewPdfIconButton({ pdfUrl }: { pdfUrl: string }) {
  const t = useTranslations("informeEditor");
  const handleView = () => {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50"
          >
            <Eye className="size-6 text-emerald-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("viewPdf")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EmailIconButton({ email, doctorName, reportContent }: { email: string; doctorName: string; reportContent: string }) {
  const t = useTranslations("emailButton");
  const tEditor = useTranslations("informeEditor");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    let data: { success?: boolean; error?: string } | null = null;
    try {
      const { doctorReportEmail } = await import("@/lib/email-template");
      const html = doctorReportEmail({ doctorName, reportContent });
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: t("subject", { doctorName }),
          text: reportContent,
          html,
        }),
      });
      data = await response.json();
    } catch {
      toast.error(tEditor("emailError"), {
        description: tEditor("emailErrorUnexpected"),
      });
    }
    if (data?.success) {
      toast.success(t("successTitle"), {
        description: t("successMessage", { doctorName }),
      });
    } else if (data) {
      toast.error(tEditor("emailError"), {
        /* v8 ignore next */
        description: data.error ?? tEditor("emailSendFailed"),
      });
    }
    setIsSending(false);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSend}
            disabled={isSending}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {isSending ? (
              <Loader2 className="size-6 animate-spin" />
            ) : (
              <Mail className="size-6" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tEditor("sendEmail")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DoctorWhatsAppIconButton({ phone, doctorName, reportContent }: { phone: string; doctorName: string; reportContent: string }) {
  const t = useTranslations("doctorWhatsappButton");
  const tEditor = useTranslations("informeEditor");

  const handleSend = () => {
    const message = encodeURIComponent(
      t("message", { doctorName, reportContent })
    );
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(t("successTitle"), {
      description: t("successMessage", { doctorName }),
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSend}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <MessageCircle className="size-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tEditor("sendWhatsApp")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DoctorReportCard({
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

function PatientReportCard({
  informeId,
  informePaciente,
  patientName,
  patientId,
  pdfUrl,
  whatsappPhone,
  whatsappOptedIn,
}: {
  informeId: string;
  informePaciente: string;
  patientName?: string;
  patientId?: string;
  pdfUrl?: string | null;
  whatsappPhone?: string;
  whatsappOptedIn?: boolean;
}) {
  const t = useTranslations("informeEditor");
  const [isEditing, setIsEditing] = useState(false);
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
          <MessageCircle className="size-5" />
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
                    <Button variant="ghost" size="sm" onClick={handleEdit} aria-label={t("editReport")} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50">
                      <Pencil className="size-6 text-emerald-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{t("editReport")}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {pdfUrl && <ViewPdfIconButton pdfUrl={pdfUrl} />}
              {whatsappPhone && patientName && (
                <WhatsAppIconButton phone={whatsappPhone} patientName={patientName} informeId={informeId} />
              )}
              {whatsappPhone && patientName && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <CertificadoIconButton informeId={informeId} patientName={patientName} phone={whatsappPhone} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p>{t("createCertificate")}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <CopyToClipboardButton text={pacienteText} />
            </>
          )}
        </div>
      </div>
      <div className="p-5 max-h-[600px] overflow-y-auto">
        {!whatsappOptedIn && patientId && patientName && whatsappPhone && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-3">
              {t("whatsappNotActivated")}
            </p>
            <WhatsAppOptInButton
              patientId={patientId}
              isOptedIn={whatsappOptedIn ?? false}
              /* v8 ignore next */
              onOptInComplete={() => window.location.reload()}
            />
          </div>
        )}
        {isEditing ? (
          <Textarea
            value={pacienteText}
            onChange={(e) => setEdited(e.target.value)}
            disabled={isSaving}
            className="min-h-[320px] resize-y text-sm leading-relaxed bg-background/50 border-border/60 focus-visible:ring-emerald-500/50 font-mono"
            placeholder={t("patientReportPlaceholder")}
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

interface InformeEditorProps {
  informeId: string;
  informeDoctor: string;
  informePaciente: string;
  patientName?: string;
  patientId?: string;
  pdfUrl?: string | null;
  whatsappPhone?: string;
  whatsappOptedIn?: boolean;
  doctorName?: string;
  doctorEmail?: string;
  doctorPhone?: string;
  isQuickReport?: boolean;
}

export function InformeEditor({
  informeId,
  informeDoctor,
  informePaciente,
  patientName,
  patientId,
  pdfUrl,
  whatsappPhone,
  whatsappOptedIn,
  doctorName,
  doctorEmail,
  doctorPhone,
  isQuickReport = false,
}: InformeEditorProps) {
  return (
    <div className="space-y-4">
      {isQuickReport ? (
        <DoctorReportCard
          informeId={informeId}
          informeDoctor={informeDoctor}
          patientName={patientName}
          doctorName={doctorName}
          doctorEmail={doctorEmail}
          doctorPhone={doctorPhone}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <DoctorReportCard
            informeId={informeId}
            informeDoctor={informeDoctor}
            patientName={patientName}
            doctorName={doctorName}
            doctorEmail={doctorEmail}
            doctorPhone={doctorPhone}
          />
          <PatientReportCard
            informeId={informeId}
            informePaciente={informePaciente}
            patientName={patientName}
            patientId={patientId}
            pdfUrl={pdfUrl}
            whatsappPhone={whatsappPhone}
            whatsappOptedIn={whatsappOptedIn}
          />
        </div>
      )}
    </div>
  );
}
