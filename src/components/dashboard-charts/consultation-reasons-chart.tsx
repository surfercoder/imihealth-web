"use client";

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  Cell,
  Pie,
  PieChart,
} = require("recharts") as typeof import("recharts");
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
import { CHART_COLORS } from "./helpers";

export function ConsultationReasonsChart({
  data,
}: {
  data: ChartData["consultationReasons"];
}) {
  const t = useTranslations("charts");

  const chartConfig = data.reduce(
    (acc, item, i) => {
      acc[item.reason] = {
        label: item.reason,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
      return acc;
    },
    {} as Record<string, { label: string; color: string }>
  ) satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("consultationReasons")}
        </CardTitle>
        <CardDescription>{t("consultationReasonsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        {data.length === 0 ? (
          <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto h-[250px] w-full">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent nameKey="reason" />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="reason"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {data.map((item, index) => (
                  <Cell
                    key={item.reason}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <ChartLegend
                content={<ChartLegendContent nameKey="reason" />}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
