"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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
  lineDash,
  type ColorMap,
  type StackedRow,
} from "@/components/charts/chart-helpers";

type Props = {
  stackedSeries: StackedRow[];
  categoryColorMap: ColorMap;
  isLoading: boolean;
};

export function CashFlowChart({
  stackedSeries,
  categoryColorMap,
  isLoading,
  title = "Cash Flow Trend",
}: Props & { title?: string }) {
  const categoryNames = useMemo(() => getCategoryNames(stackedSeries), [stackedSeries]);

  const paddedSeries = useMemo(() => {
    if (categoryNames.length === 0) return stackedSeries;
    return stackedSeries.map((item) => {
      const copy = { ...item };
      for (const name of categoryNames) {
        if (!(name in copy)) copy[name] = 0;
      }
      return copy;
    });
  }, [stackedSeries, categoryNames]);

  return (
    <ChartCard title={title}>
      {isLoading ? (
        <ChartSkeleton />
      ) : paddedSeries.length < 1 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[var(--color-muted)] sm:h-[280px]">
          No trend data yet
        </div>
      ) : (
        <div
          role="img"
          aria-label={`${title}: ${categoryNames.join(", ")}`}
          tabIndex={0}
          className="h-64 w-full sm:h-[280px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={paddedSeries}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="name" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tick={CHART_TICK} width={48} />
              <Tooltip content={<ChartTooltip />} cursor={CHART_CURSOR} />
              {categoryNames.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={chartColor(categoryColorMap, name, "var(--chart-2)")}
                  strokeDasharray={lineDash(i)}
                  strokeWidth={2.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
