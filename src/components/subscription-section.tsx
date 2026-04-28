import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CancelSubscriptionButton } from "@/components/cancel-subscription-button";
import type { PlanInfo, PlanTier, SubscriptionStatus } from "@/actions/plan";

interface Props {
  plan: PlanInfo;
}

function planLabel(tier: PlanTier, t: (key: string) => string): string {
  if (tier === "pro_monthly") return t("proMonthlyName");
  if (tier === "pro_yearly") return t("proYearlyName");
  return t("freePlanName");
}

function statusVariant(
  isReadOnly: boolean,
  status: SubscriptionStatus,
): "default" | "secondary" | "destructive" {
  if (isReadOnly) return "destructive";
  if (status === "active") return "default";
  return "secondary";
}

function statusKey(plan: PlanInfo): string {
  if (plan.isReadOnly) return "statusReadOnly";
  switch (plan.status) {
    case "active":
      return "statusActive";
    case "pending":
      return "statusPending";
    case "cancelled":
      return "statusCancelled";
    case "past_due":
      return "statusPastDue";
  }
}

function formatPeriodEnd(periodEnd: string): string {
  return new Date(periodEnd).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function SubscriptionSection({ plan }: Props) {
  const t = await getTranslations("subscription");
  const formattedPeriodEnd = plan.periodEnd
    ? formatPeriodEnd(plan.periodEnd)
    : null;

  return (
    <section
      className="rounded-xl border bg-card p-6 shadow-sm"
      aria-labelledby="subscription-heading"
    >
      <h2
        id="subscription-heading"
        className="text-lg font-semibold tracking-tight"
      >
        {t("sectionTitle")}
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {t("currentPlanLabel")}:
        </span>
        <span className="font-medium">{planLabel(plan.plan, t)}</span>
        <Badge variant={statusVariant(plan.isReadOnly, plan.status)}>
          {t(statusKey(plan) as Parameters<typeof t>[0])}
        </Badge>
      </div>

      {formattedPeriodEnd && plan.isPro ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {plan.status === "cancelled"
            ? t("endsOn", { date: formattedPeriodEnd })
            : t("renewsOn", { date: formattedPeriodEnd })}
        </p>
      ) : null}

      {plan.plan === "free" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("freeUsage", {
            used: plan.currentInformes,
            max: plan.maxInformes,
          })}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {plan.plan === "free" || plan.isReadOnly ? (
          <Button asChild size="sm">
            <Link href="/pricing">
              {plan.isReadOnly ? t("reactivateCta") : t("upgradeCta")}
            </Link>
          </Button>
        ) : null}
        {plan.isPro && plan.status !== "cancelled" ? (
          <CancelSubscriptionButton />
        ) : null}
      </div>
    </section>
  );
}
