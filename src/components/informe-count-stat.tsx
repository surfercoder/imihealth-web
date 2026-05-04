"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

export function InformeCountStat({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  const tFreePlan = useTranslations("freePlanLimits");

  return (
    <div className="flex items-center gap-1.5">
      <p className="text-2xl font-bold text-card-foreground">
        {current}{" "}
        <span className="text-base font-normal text-muted-foreground">
          / {max}
        </span>
      </p>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="size-3.5" />
              <span className="sr-only">Info</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px]">
            {tFreePlan("dashboardTooltip", { max })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
