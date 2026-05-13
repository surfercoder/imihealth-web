"use client";

import { Eye, FileText, Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface SuccessStepProps {
  isSendingWa: boolean;
  pedidoCount: number;
  mergedUrl: string;
  onSendWhatsApp: () => void;
  onResetToIdle: () => void;
}

export function SuccessStep({
  isSendingWa,
  pedidoCount,
  mergedUrl,
  onSendWhatsApp,
  onResetToIdle,
}: SuccessStepProps) {
  const t = useTranslations("dictarPedidos");
  const tWa = useTranslations("whatsappPedidosButton");

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
        <FileText className="size-7 text-primary" />
      </div>
      <p className="text-sm text-center text-muted-foreground">
        {t("successMessage")}
      </p>
      <p className="text-xs text-center text-muted-foreground">
        {t("pedidoCount", { count: pedidoCount })}
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
        {tWa("label")}
      </Button>
      <Button
        className="w-full bg-zinc-950 hover:bg-zinc-950/80 text-white"
        onClick={() => window.open(mergedUrl, "_blank")}
      >
        <Eye className="size-4 mr-1.5" />
        {t("viewOnline")}
      </Button>
      <Button variant="outline" className="w-full" onClick={onResetToIdle}>
        {t("generateAnother")}
      </Button>
    </div>
  );
}
