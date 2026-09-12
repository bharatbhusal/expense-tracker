"use client";

import { useAppSelector } from "@/store/hooks";
import { formatChartCurrency } from "@/components/charts/chart-helpers";

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, string | number>;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
};

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  const currency = useAppSelector((s) => s.ui.currency);

  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-[var(--shadow-elevated)]">
      <p className="mb-1.5 font-medium text-[var(--color-text)]">{label}</p>
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={item.name ?? i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color ?? "var(--chart-1)" }}
              />
              <span className="text-[var(--color-muted)]">{item.name}</span>
            </div>
            <span className="text-[var(--color-text)]">
              {formatChartCurrency(Number(item.value) || 0, currency)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between border-t border-[var(--color-border)] pt-1.5 font-medium">
        <span className="text-[var(--color-text)]">Total</span>
        <span className="text-[var(--color-text)]">{formatChartCurrency(total, currency)}</span>
      </div>
    </div>
  );
}
