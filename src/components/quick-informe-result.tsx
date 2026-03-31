"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface QuickInformeResultProps {
  informe: string;
}

export function QuickInformeResult({ informe }: QuickInformeResultProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(informe);
      setIsCopied(true);
      toast.success(t("common.copied"), { description: t("informes.copiedToClipboard") });
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error(t("common.error"), { description: t("informes.copyError") });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-card-foreground">{t("informes.doctorReport")}</h3>
          <Button onClick={handleCopy} variant="outline" size="sm">
            {isCopied ? (
              <>
                <Check className="size-4 mr-2" />
                {t("common.copied")}
              </>
            ) : (
              <>
                <Copy className="size-4 mr-2" />
                {t("common.copy")}
              </>
            )}
          </Button>
        </div>

        <Textarea
          value={informe}
          readOnly
          rows={20}
          className="resize-none font-mono text-sm"
        />
      </div>

      <div className="flex gap-3">
        <Button onClick={() => router.push("/")} variant="outline" className="flex-1">
          <ArrowLeft className="size-4 mr-2" />
          {t("nav.home")}
        </Button>
        <Button onClick={() => router.push("/quick-informe")} className="flex-1">
          {t("informes.createAnother")}
        </Button>
      </div>
    </div>
  );
}
