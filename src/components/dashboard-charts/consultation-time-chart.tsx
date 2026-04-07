"use client";

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} = require("recharts") as typeof import("recharts");
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartData } from "@/actions/dashboard-charts";
import { useTranslations } from "next-intl";

export function ConsultationTimeChart({
  data,
}: {
  data: ChartData["consultationTime"];
}) {
  const t = useTranslations("charts");

  const summaryData = [
    { label: t("average"), value: data.avg, fill: "var(--color-chart-2)" },
    { label: t("minimum"), value: data.min, fill: "var(--color-chart-4)" },
    { label: t("maximum"), value: data.max, fill: "var(--color-chart-1)" },
  ];

  const summaryConfig = {
    value: { label: t("minutes") },
    [t("average")]: { label: t("average"), color: "var(--color-chart-2)" },
    [t("minimum")]: { label: t("minimum"), color: "var(--color-chart-4)" },
    [t("maximum")]: { label: t("maximum"), color: "var(--color-chart-1)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("consultationTime")}
        </CardTitle>
        <CardDescription>{t("consultationTimeDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <ChartContainer config={summaryConfig} className="h-[250px] w-full">
          <BarChart accessibilityLayer data={summaryData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              unit=" min"
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {summaryData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
        {data.data.length > 0 && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t("basedOn", { count: data.data.length })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
