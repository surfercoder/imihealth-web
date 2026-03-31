"use client";

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
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

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

// 1. Patients over time — Area chart
function PatientsOverTimeChart({
  data,
}: {
  data: ChartData["patientsOverTime"];
}) {
  const t = useTranslations("charts");

  const chartConfig = {
    total: {
      label: t("totalPatients"),
      color: "var(--color-chart-2)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("patientsOverTime")}
        </CardTitle>
        <CardDescription>{t("patientsOverTimeDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <AreaChart accessibilityLayer data={data}>
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-chart-2)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-chart-2)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
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
            <Area
              dataKey="total"
              type="monotone"
              fill="url(#fillTotal)"
              stroke="var(--color-chart-2)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// 2. Consultation time — Bar chart with avg/min/max
function ConsultationTimeChart({
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

// 3. Daily patient accumulator — Line chart with average reference
function PatientsAccumulatorChart({
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

// 4. Consultation reasons — Pie chart
function ConsultationReasonsChart({
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
