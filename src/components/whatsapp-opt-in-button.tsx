"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

interface WhatsAppOptInButtonProps {
  patientId: string;
  isOptedIn: boolean;
  onOptInComplete?: () => void;
}

export function WhatsAppOptInButton({
  patientId,
  isOptedIn,
  onOptInComplete
}: WhatsAppOptInButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const t = useTranslations("whatsappOptIn");

  const handleOptIn = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/patients/whatsapp-opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t("successTitle"), {
          description: t("successDesc"),
        });
        onOptInComplete?.();
      } else {
        toast.error(t("errorTitle"), {
          description: data.error || t("errorFallback"),
        });
      }
    } catch {
      toast.error(t("connectionError"), {
        description: t("connectionErrorDesc"),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isOptedIn) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle className="size-4" />
        <span>{t("activated")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        size="sm"
        onClick={handleOptIn}
        disabled={isProcessing}
        className="bg-[#25D366] hover:bg-[#1ebe5d] text-white"
      >
        {isProcessing ? (
          <Loader2 className="size-4 mr-1.5 animate-spin" />
        ) : (
          <CheckCircle className="size-4 mr-1.5" />
        )}
        {t("activateButton")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t("description")}
      </p>
    </div>
  );
}
