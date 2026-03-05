"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface WhatsAppButtonProps {
  phone: string;
  patientName: string;
  pdfUrl: string;
}

export function WhatsAppButton({ phone, patientName, pdfUrl }: WhatsAppButtonProps) {
  const t = useTranslations("whatsappButton");

  const handleSend = () => {
    const message = encodeURIComponent(
      t("message", { patientName, pdfUrl })
    );
    const url = `https://wa.me/${phone}?text=${message}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(t("successTitle"), {
      description: t("successMessage", { patientName }),
    });
  };

  return (
    <Button size="sm" onClick={handleSend} className="bg-[#25D366] hover:bg-[#1ebe5d] text-white">
      <MessageCircle className="size-4 mr-1.5" />
      {t("label")}
    </Button>
  );
}
