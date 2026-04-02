"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";

interface WhatsAppButtonProps {
  phone: string;
  patientName: string;
  pdfUrl: string;
  isOptedIn?: boolean;
}

export function WhatsAppButton({ phone, patientName, pdfUrl, isOptedIn = false }: WhatsAppButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const locale = useLocale();
  const t = useTranslations("whatsappButton");
  const tOptIn = useTranslations("whatsappOptIn");

  const handleSend = async () => {
    if (!isOptedIn) {
      toast.warning(tOptIn("notActivatedTitle"), {
        description: tOptIn("notActivatedDesc"),
      });
      return;
    }

    const templateName = locale === "es" ? "patient_report_es" : "patient_report_en";
    const languageCode = locale === "es" ? "es_AR" : "en";
    const fallbackError = t("errorMessage");
    setIsSending(true);
    let data: { success?: boolean; error?: string } | null = null;
    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          templateName,
          languageCode,
          parameters: [patientName, pdfUrl],
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
    <Button
      size="sm"
      onClick={handleSend}
      disabled={isSending}
      className="bg-[#25D366] hover:bg-[#1ebe5d] text-white"
    >
      {isSending ? (
        <Loader2 className="size-4 mr-1.5 animate-spin" />
      ) : (
        <MessageCircle className="size-4 mr-1.5" />
      )}
      {t("label")}
    </Button>
  );
}
