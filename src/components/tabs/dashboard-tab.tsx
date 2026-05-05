"use client";

import { CheckCircle2, Clock, AlertCircle, Users, FileText } from "lucide-react";
import { InformeCountStat } from "@/components/informe-count-stat";
import { Separator } from "@/components/ui/separator";
import { DashboardCharts } from "@/components/dashboard-charts";
import type { ChartData } from "@/actions/dashboard-charts";
import type { PlanInfo } from "@/actions/subscriptions";
import { useTranslations } from "next-intl";

interface DashboardTabProps {
  totalPatients: number;
  totalInformes: number;
  completedCount: number;
  processingCount: number;
  errorCount: number;
  plan: PlanInfo;
  chartData: ChartData | null;
}

export function DashboardTab({
  totalPatients,
  totalInformes,
  completedCount,
  processingCount,
  errorCount,
  plan,
  chartData,
}: DashboardTabProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {t("dashboard.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{totalPatients}</p>
              <p className="text-xs text-muted-foreground">{t("home.stats.patients")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileText className="size-4" />
            </div>
            <div>
              <InformeCountStat current={totalInformes} max={plan.maxInformes} />
              <p className="text-xs text-muted-foreground">{t("home.stats.totalReports")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">{completedCount}</p>
              <p className="text-xs text-muted-foreground">{t("home.stats.completed")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex size-9 items-center justify-center rounded-lg ${errorCount > 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {errorCount > 0 ? (
                <AlertCircle className="size-4" />
              ) : (
                <Clock className="size-4" />
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-card-foreground">
                {errorCount > 0 ? errorCount : processingCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {errorCount > 0 ? t("home.stats.withErrors") : t("home.stats.processing")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {chartData && (
        <>
          <Separator />
          <DashboardCharts data={chartData} />
        </>
      )}
    </div>
  );
}
