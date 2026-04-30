"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PlanInfo } from "@/actions/plan";

interface Props {
  plan: PlanInfo;
}

export function PlanBadge({ plan }: Props) {
  const t = useTranslations("planBadge");
  const isPro = plan.isPro;

  return (
    <Link
      href="/pricing"
      aria-label={isPro ? t("manageProAria") : t("upgradeAria")}
      className="inline-flex items-center hover:opacity-80 transition-opacity"
    >
      <Badge
        variant={isPro ? "default" : "secondary"}
        className="gap-1 cursor-pointer"
      >
        {isPro ? <Sparkles className="size-3" /> : null}
        {isPro ? t("pro") : t("free")}
      </Badge>
    </Link>
  );
}
