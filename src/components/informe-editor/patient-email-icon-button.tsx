"use client";

import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { patientReportEmail } from "@/lib/email-template";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PatientEmailIconButton({
  email,
  patientName,
  doctorName,
  reportContent,
}: {
  email: string;
  patientName: string;
  doctorName: string;
  reportContent: string;
}) {
  const t = useTranslations("patientEmailButton");
  const tEditor = useTranslations("informeEditor");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    let data: { success?: boolean; error?: string } | null = null;
    try {
      const escapedPatientName = patientName
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const html = patientReportEmail({
        patientName,
        doctorName,
        reportContent,
        labels: {
          greeting: t.markup("emailGreeting", {
            patientName: escapedPatientName,
            strong: (chunks) => `<strong>${chunks}</strong>`,
          }),
          intro: t("emailIntro", { doctorName }),
          disclaimer: t("emailDisclaimer"),
          preheader: t("emailPreheader", { patientName }),
          footerTagline: t("emailFooterTagline"),
        },
      });
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
        description: t("successMessage", { patientName }),
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
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50"
          >
            {isSending ? (
              <Loader2 className="size-6 animate-spin text-emerald-600" />
            ) : (
              <Mail className="size-6 text-emerald-600" />
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
