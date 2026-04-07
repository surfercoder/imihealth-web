"use client";

import { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function WhatsAppIconButton({ phone, patientName, informeId }: { phone: string; patientName: string; informeId: string }) {
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
