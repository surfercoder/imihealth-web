"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnterpriseDialog } from "./enterprise-dialog";
import { ProCheckoutButton } from "./pro-checkout-button";

type Cycle = "monthly" | "yearly";

interface Props {
  isSignedIn?: boolean;
}

const FREE_FEATURES = [
  "informes_10",
  "voice_dictation",
  "patient_mgmt",
  "pdf_export",
] as const;
const PRO_FEATURES = [
  "informes_unlimited",
  "voice_dictation",
  "patient_mgmt",
  "pdf_export",
  "priority_support",
] as const;
const ENT_FEATURES = [
  "bulk_seats",
  "billing_invoice",
  "training",
  "dedicated_support",
] as const;

export function PricingCards({ isSignedIn = false }: Props) {
  const t = useTranslations("pricing");
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const proPrice =
    cycle === "monthly" ? t("proPriceMonthly") : t("proPriceYearly");
  const proPeriod = cycle === "monthly" ? t("perMonth") : t("perYear");
  const proPlan = cycle === "monthly" ? "pro_monthly" : "pro_yearly";

  return (
    <div>
      <div className="flex justify-center mb-10">
        <div
          role="tablist"
          aria-label={t("toggleAriaLabel")}
          className="inline-flex rounded-full border border-border bg-card p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "monthly"}
            onClick={() => setCycle("monthly")}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              cycle === "monthly"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t("toggleMonthly")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={cycle === "yearly"}
            onClick={() => setCycle("yearly")}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1.5 ${
              cycle === "yearly"
                ? "bg-primary text-primary-foreground"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t("toggleYearly")}
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 leading-tight"
            >
              {t("save60")}
            </Badge>
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <PlanCard
          title={t("freeTitle")}
          subtitle={t("freeSubtitle")}
          price={t("freePrice")}
          period={t("forever")}
          features={FREE_FEATURES.map((key) => t(`features.${key}`))}
          cta={
            <Button asChild variant="outline" className="w-full">
              <Link href="/signup">{t("freeCta")}</Link>
            </Button>
          }
        />

        <PlanCard
          title={t("proTitle")}
          subtitle={t("proSubtitle")}
          price={proPrice}
          period={proPeriod}
          highlighted
          highlightLabel={t("popular")}
          extraNote={cycle === "yearly" ? t("yearlyHint") : undefined}
          features={PRO_FEATURES.map((key) => t(`features.${key}`))}
          cta={
            <ProCheckoutButton plan={proPlan} isSignedIn={isSignedIn}>
              {t("proCta")}
            </ProCheckoutButton>
          }
        />

        <PlanCard
          title={t("enterpriseTitle")}
          subtitle={t("enterpriseSubtitle")}
          price={t("custom")}
          features={ENT_FEATURES.map((key) => t(`features.${key}`))}
          cta={
            <EnterpriseDialog>
              <Button variant="outline" className="w-full">
                {t("enterpriseCta")}
              </Button>
            </EnterpriseDialog>
          }
        />
      </div>
    </div>
  );
}

interface PlanCardProps {
  title: string;
  subtitle: string;
  price: string;
  period?: string;
  features: string[];
  cta: React.ReactNode;
  highlighted?: boolean;
  highlightLabel?: string;
  extraNote?: string;
}

function PlanCard({
  title,
  subtitle,
  price,
  period,
  features,
  cta,
  highlighted,
  highlightLabel,
  extraNote,
}: PlanCardProps) {
  return (
    <div
      className={`rounded-2xl border bg-card p-8 shadow-sm relative ${
        highlighted ? "border-2 border-primary shadow-md" : ""
      }`}
    >
      {highlighted && highlightLabel ? (
        <Badge className="absolute -top-3 left-8">{highlightLabel}</Badge>
      ) : null}
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground min-h-10">{subtitle}</p>
      <div className="mt-6">
        <span className="text-4xl font-bold">{price}</span>
        {period ? (
          <span className="text-muted-foreground"> {period}</span>
        ) : null}
      </div>
      {extraNote ? (
        <p className="mt-1 text-xs text-primary">{extraNote}</p>
      ) : null}
      <div className="mt-6">{cta}</div>
      <ul className="mt-6 space-y-2 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="size-4 mt-0.5 text-primary shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
