"use client";

/* eslint-disable @typescript-eslint/no-require-imports */
const { Pie, PieChart } = require("recharts") as typeof import("recharts");
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

export function InformTypesChart({
  data,
}: {
  data: ChartData["informTypes"];
}) {
  const t = useTranslations("charts");

  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartConfig = {
    count: { label: t("informTypes") },
    classic: { label: t("classicInforms"), color: "var(--chart-1)" },
    quick: { label: t("quickInforms"), color: "var(--chart-2)" },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {t("informTypes")}
        </CardTitle>
        <CardDescription>{t("informTypesDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden">
        {total === 0 ? (
          <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            {t("noData")}
          </p>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[250px] px-0"
            >
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="type" hideLabel />}
                />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="type"
                  labelLine={false}
                  label={((props: Record<string, unknown>) => (
                    <text
                      x={props.x as number}
                      y={props.y as number}
                      textAnchor={props.textAnchor as "start" | "middle" | "end"}
                      dominantBaseline={props.dominantBaseline as "auto" | "middle" | "central"}
                      fill="var(--foreground)"
                    >
                      {(props.payload as { count: number }).count}
                    </text>
                  )) as unknown as boolean}
                />
              </PieChart>
            </ChartContainer>
            <div className="flex items-center justify-center gap-4 pt-3">
              {(["classic", "quick"] as const).map((key) => (
                <div key={key} className="flex items-center gap-1.5 text-sm">
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: chartConfig[key].color }}
                  />
                  {chartConfig[key].label}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
