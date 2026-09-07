"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  BarStack,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import {
  CHART_CURSOR,
  CHART_GRID,
  CHART_TICK,
  chartColor,
  getCategoryNames,
  type StackedRow,
} from "@/components/charts/chart-helpers";

type Props = {
  stackedSeries: StackedRow[];
  chartLabel?: string;
  averageSpend?: number;
  categoryColorMap: Record<string, string>;
  isLoading: boolean;
};

export function SpendingBarChart({
  stackedSeries,
  chartLabel,
  averageSpend,
  categoryColorMap,
  isLoading,
}: Props) {
  const categoryNames = useMemo(() => getCategoryNames(stackedSeries), [stackedSeries]);

  const label = chartLabel ?? "Spending Trend";

  return (
    <ChartCard title={label}>
      {isLoading ? (
        <ChartSkeleton />
      ) : categoryNames.length < 1 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[var(--color-muted)] sm:h-[280px]">
          No spending data yet
        </div>
      ) : (
        <div
          role="img"
          aria-label={`${label}: ${categoryNames.join(", ")}`}
          tabIndex={0}
          className="h-64 w-full sm:h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedSeries}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="name" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tick={CHART_TICK} width={48} />
              <Tooltip content={<ChartTooltip />} cursor={CHART_CURSOR} />
              {/* ponytail: BarStack clips the whole stack to rounded corners per
                  bar (recharts >=3.6), so top rounding is consistent even when the
                  last category is 0 on some bars */}
              <BarStack radius={[6, 6, 0, 0]}>
                {categoryNames.map((name) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    stackId="spend"
                    fill={chartColor(categoryColorMap, name, "var(--chart-1)")}
                  />
                ))}
              </BarStack>
              {(averageSpend ?? 0) > 0 && (
                <ReferenceLine
                  y={averageSpend}
                  stroke="var(--chart-2)"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: `Avg: ${(averageSpend ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
                    position: "left",
                    fill: "var(--chart-2)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
