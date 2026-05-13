"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function DoctorWhatsAppIconButton({ phone, doctorName, reportContent }: { phone: string; doctorName: string; reportContent: string }) {
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
            className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
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
