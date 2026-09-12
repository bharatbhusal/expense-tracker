export type StackedRow = Record<string, string | number>;

// ponytail: shared ~15-line dup from cash-flow + spending-bar charts.
export function getCategoryNames(series: StackedRow[]): string[] {
  const names = new Set<string>();
  for (const row of series) {
    for (const key of Object.keys(row)) {
      if (key !== "name") names.add(key);
    }
  }
  return Array.from(names);
}

export type ColorMap = Map<string, string> | Record<string, string>;

// ponytail: single fallback chain — explicit color, then CSS var palette.
export function chartColor(
  map: ColorMap | undefined,
  name: string,
  fallback = "var(--chart-1)",
): string {
  if (!map) return fallback;
  if (map instanceof Map) return map.get(name) ?? fallback;
  return map[name] ?? fallback;
}

// ponytail: one currency locale for all charts (en-US).
export function formatChartCurrency(value: number, currency = "USD"): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ponytail: one axis/grid/palette source; XAxis keeps
// interval="preserveStartEnd" + minTickGap so ticks survive 375px widths.
export const CHART_TICK = { fill: "var(--color-muted)", fontSize: 11 } as const;
export const CHART_GRID = { strokeDasharray: "3 3", stroke: "var(--color-border)" } as const;
export const CHART_CURSOR = { stroke: "var(--color-border)" } as const;

// ponytail: dash per series index so multi-line trends are not hue-only.
const LINE_DASHES = ["", "6 3", "3 3 2 3", "8 3 3 3"];
export function lineDash(index: number): string | undefined {
  return LINE_DASHES[index % LINE_DASHES.length] || undefined;
}
