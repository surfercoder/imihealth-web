"use client";

import { Eye, FileText, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PedidosSuccessProps {
  isSendingWa: boolean;
  onSendWhatsApp: () => void;
  onResetForm: () => void;
  successMessage: string;
  whatsappLabel: string;
  generateAnotherLabel: string;
  viewOnlineLabel: string;
  pedidoCount: number;
  mergedUrl: string;
}

export function PedidosSuccess({
  isSendingWa,
  onSendWhatsApp,
  onResetForm,
  successMessage,
  whatsappLabel,
  generateAnotherLabel,
  viewOnlineLabel,
  pedidoCount,
  mergedUrl,
}: PedidosSuccessProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <FileText className="size-7 text-primary" />
      </div>
      <p className="text-sm text-center text-muted-foreground">
        {successMessage}
      </p>
      <p className="text-xs text-center text-muted-foreground">
        {pedidoCount} {pedidoCount === 1 ? "pedido generado" : "pedidos generados"}
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
        className="w-full bg-black hover:bg-black/80 text-white"
        onClick={() => window.open(mergedUrl, "_blank")}
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
