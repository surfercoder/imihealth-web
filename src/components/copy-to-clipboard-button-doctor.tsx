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

interface CopyToClipboardButtonDoctorProps {
  text: string;
}

export function CopyToClipboardButtonDoctor({ text }: CopyToClipboardButtonDoctorProps) {
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
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            {copied ? <Check className="size-6" /> : <Copy className="size-6" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("copyToClipboard")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
