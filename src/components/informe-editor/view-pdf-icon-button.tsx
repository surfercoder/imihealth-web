"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ViewPdfIconButton({ pdfUrl }: { pdfUrl: string }) {
  const t = useTranslations("informeEditor");
  const handleView = () => {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleView}
            className="size-7 p-0 text-muted-foreground hover:text-foreground hover:bg-emerald-100/50"
          >
            <Eye className="size-6 text-emerald-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("viewPdf")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
