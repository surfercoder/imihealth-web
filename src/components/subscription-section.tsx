import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CancelSubscriptionButton } from "@/components/cancel-subscription-button";
import type { PlanInfo } from "@/actions/plan";

interface Props {
  plan: PlanInfo;
  /** Hide the upgrade/reactivate CTA when the surrounding page already
   *  exposes the plan picker (e.g. /pricing). Default: false. */
  hideUpgradeCta?: boolean;
}

interface BadgeSpec {
  label: string;
  variant: "default" | "secondary" | "destructive";
}

function planLabel(plan: PlanInfo, t: (key: string) => string): string {
  if (!plan.isPro) return t("freePlanName");
  if (plan.plan === "pro_monthly") return t("proMonthlyName");
  if (plan.plan === "pro_yearly") return t("proYearlyName");
  return t("freePlanName");
}

function statusBadge(
  plan: PlanInfo,
  t: (key: string) => string,
): BadgeSpec | null {
  if (plan.isReadOnly) {
    return { label: t("statusReadOnly"), variant: "destructive" };
  }
  if (plan.isPro) {
    if (plan.status === "past_due") {
      return { label: t("statusPastDue"), variant: "secondary" };
    }
    return { label: t("statusActive"), variant: "default" };
  }
  if (plan.status === "pending") {
    return { label: t("statusPending"), variant: "secondary" };
  }
  if (plan.status === "cancelled") {
    return { label: t("statusCancelled"), variant: "secondary" };
  }
  return null;
}

function formatPeriodEnd(periodEnd: string): string {
  return new Date(periodEnd).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function SubscriptionSection({ plan, hideUpgradeCta = false }: Props) {
  const t = await getTranslations("subscription");
  const formattedPeriodEnd = plan.periodEnd
    ? formatPeriodEnd(plan.periodEnd)
    : null;
  const badge = statusBadge(plan, t);

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
        <span className="font-medium">{planLabel(plan, t)}</span>
        {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
      </div>

      {plan.isPro && plan.status === "active" && formattedPeriodEnd ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("renewsOn", { date: formattedPeriodEnd })}
        </p>
      ) : null}

      {!plan.isPro ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("freeUsage", {
            used: plan.currentInformes,
            max: plan.maxInformes,
          })}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {!plan.isPro && !hideUpgradeCta ? (
          <Button asChild size="sm">
            <Link href="/pricing">
              {plan.isReadOnly ? t("reactivateCta") : t("upgradeCta")}
            </Link>
          </Button>
        ) : null}
        {plan.isPro && plan.status === "active" ? (
          <CancelSubscriptionButton />
        ) : null}
      </div>
    </section>
  );
}
