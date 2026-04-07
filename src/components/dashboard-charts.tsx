"use client";

import type { ChartData } from "@/actions/dashboard-charts";
import { useTranslations } from "next-intl";
import { PatientsOverTimeChart } from "./dashboard-charts/patients-over-time-chart";
import { ConsultationTimeChart } from "./dashboard-charts/consultation-time-chart";
import { PatientsAccumulatorChart } from "./dashboard-charts/patients-accumulator-chart";
import { ConsultationReasonsChart } from "./dashboard-charts/consultation-reasons-chart";

export function DashboardCharts({ data }: { data: ChartData }) {
  const t = useTranslations("charts");

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-foreground">
        {t("sectionTitle")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <PatientsOverTimeChart data={data.patientsOverTime} />
        <ConsultationTimeChart data={data.consultationTime} />
        <PatientsAccumulatorChart data={data.patientsAccumulator} />
        <ConsultationReasonsChart data={data.consultationReasons} />
      </div>
    </section>
  );
}
