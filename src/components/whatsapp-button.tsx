"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  phone: string;
  patientName: string;
  pdfUrl: string;
}

export function WhatsAppButton({ phone, patientName, pdfUrl }: WhatsAppButtonProps) {
  const handleSend = () => {
    const message = `Hola ${patientName}, aquí tiene su informe: ${pdfUrl}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      size="sm"
      onClick={handleSend}
      className="bg-[#25D366] hover:bg-[#1ebe5d] text-white"
    >
      <MessageCircle className="size-4 mr-1.5" />
      Enviar por WhatsApp
    </Button>
  );
}
