"use client";

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
import { formatDate } from "./helpers";

export function PatientsAccumulatorChart({
  data,
}: {
  data: ChartData["patientsAccumulator"];
}) {
  const t = useTranslations("charts");

  const chartConfig = {
    patients: {
      label: t("newPatients"),
      color: "var(--color-chart-3)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("dailyPatients")}
        </CardTitle>
        <CardDescription>
          {t("dailyPatientsDesc", {
            avg: data.average,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart accessibilityLayer data={data.current}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDate}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDate(value as string)}
                />
              }
            />
            <ReferenceLine
              y={data.average}
              stroke="var(--color-chart-5)"
              strokeDasharray="5 5"
              label={{
                value: `${t("avg")}: ${data.average}`,
                position: "insideTopRight",
                fill: "var(--color-chart-5)",
                fontSize: 12,
              }}
            />
            <Line
              dataKey="patients"
              type="monotone"
              stroke="var(--color-chart-3)"
              strokeWidth={2}
              dot={{ fill: "var(--color-chart-3)", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
