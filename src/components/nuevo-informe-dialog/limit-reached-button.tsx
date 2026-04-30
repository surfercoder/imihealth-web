"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/contexts/plan-context";

interface LimitReachedButtonProps {
  fullWidth?: boolean;
}

export function LimitReachedButton({ fullWidth = false }: LimitReachedButtonProps) {
  const tMvp = useTranslations("mvpLimits");
  const plan = usePlan();

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size={fullWidth ? "default" : "sm"}
        className={fullWidth ? "w-full" : ""}
        asChild
      >
        <Link href="/pricing">
          <Sparkles className="size-4 mr-1.5" />
          {tMvp("informeLimitUpgradeCta")}
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground max-w-[240px] text-right">
        {tMvp("informeLimitMessage", { max: plan.maxInformes })}
      </p>
    </div>
  );
}
