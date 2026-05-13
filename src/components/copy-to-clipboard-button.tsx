"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { stripMarkdown } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyToClipboardButtonProps {
  text: string;
}

export function CopyToClipboardButton({ text }: CopyToClipboardButtonProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("common");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(stripMarkdown(text));
    setCopied(true);
    toast.success(t("copiedToClipboard"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            title={t("copyToClipboard")}
            className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50"
          >
            {copied ? <Check className="size-6 text-emerald-600" /> : <Copy className="size-6 text-emerald-600" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("copyToClipboard")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
