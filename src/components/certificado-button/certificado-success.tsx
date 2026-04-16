"use client";

import { Eye, FileText, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CertificadoSuccessProps {
  isSendingWa: boolean;
  onSendWhatsApp: () => void;
  onResetForm: () => void;
  successMessage: string;
  whatsappLabel: string;
  generateAnotherLabel: string;
  viewOnlineLabel: string;
  certUrl: string;
}

export function CertificadoSuccess({
  isSendingWa,
  onSendWhatsApp,
  onResetForm,
  successMessage,
  whatsappLabel,
  generateAnotherLabel,
  viewOnlineLabel,
  certUrl,
}: CertificadoSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <FileText className="size-7 text-primary" />
      </div>
      <p className="text-sm text-center text-muted-foreground">
        {successMessage}
      </p>
      <Button
        className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white"
        onClick={onSendWhatsApp}
        disabled={isSendingWa}
      >
        {isSendingWa ? (
          <Loader2 className="size-4 mr-1.5 animate-spin" />
        ) : (
          <MessageCircle className="size-4 mr-1.5" />
        )}
        {whatsappLabel}
      </Button>
      <Button
        className="w-full bg-gray-950 hover:bg-gray-950/80 text-white"
        onClick={() => window.open(certUrl, "_blank")}
      >
        <Eye className="size-4 mr-1.5" />
        {viewOnlineLabel}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={onResetForm}
      >
        {generateAnotherLabel}
      </Button>
    </div>
  );
}
