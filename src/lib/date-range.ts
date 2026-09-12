type DateRangePreset = "day" | "week" | "month" | "year";

export type GlobalDateRange = {
  preset: DateRangePreset;
  offset: number;
};

export const DEFAULT_GLOBAL_RANGE: GlobalDateRange = {
  preset: "month",
  offset: 0,
};

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toIsoBounds(range: GlobalDateRange): {
  from?: string;
  to?: string;
} {
  const now = new Date();

  if (range.preset === "day") {
    const from = new Date(now);
    from.setDate(now.getDate() - range.offset);
    from.setHours(0, 0, 0, 0);
    if (range.offset === 0) {
      return {
        from: from.toISOString(),
        to: now.toISOString(),
      };
    }
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (range.preset === "week") {
    const monday = getMonday(now);
    monday.setDate(monday.getDate() - range.offset * 7);
    const from = new Date(monday);
    if (range.offset === 0) {
      const to = new Date(now);
      return {
        from: from.toISOString(),
        to: to.toISOString(),
      };
    }
    const to = new Date(monday);
    to.setDate(to.getDate() + 6);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  if (range.preset === "year") {
    const year = now.getFullYear() - range.offset;
    const from = new Date(year, 0, 1);
    if (range.offset === 0) {
      return {
        from: from.toISOString(),
        to: now.toISOString(),
      };
    }
    const to = new Date(year, 11, 31, 23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }

  const month = now.getMonth() - range.offset;
  const from = new Date(now.getFullYear(), month, 1);
  if (range.offset === 0) {
    return {
      from: from.toISOString(),
      to: now.toISOString(),
    };
  }
  const to = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

import type { DateFilter, FilterDatePreset } from "@/constants/types/search.types";

export type { FilterDatePreset };

const FILTER_PRESET_LABELS: Record<FilterDatePreset, string> = {
  TODAY: "Today",
  YESTERDAY: "Yesterday",
  THIS_WEEK: "This Week",
  LAST_WEEK: "Last Week",
  THIS_MONTH: "This Month",
  LAST_MONTH: "Last Month",
  LAST_6_MONTHS: "Last 6 Months",
  THIS_YEAR: "This Year",
  LAST_YEAR: "Last Year",
  CUSTOM: "Custom",
};

export function presetLabel(preset: FilterDatePreset): string {
  return FILTER_PRESET_LABELS[preset];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

export function boundsForBudgetPeriod(period: "weekly" | "monthly" | "yearly"): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  if (period === "weekly") return { from: startOfWeek(now), to: now };
  if (period === "monthly")
    return { from: startOfMonth(now.getFullYear(), now.getMonth()), to: now };
  return { from: startOfMonth(now.getFullYear(), 0), to: now };
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

// ponytail: union-first entry point — resource builders pass filter.date straight through.
export function resolveDateRange(date?: DateFilter): { from?: string; to?: string } | null {
  if (!date) return null;
  if (date.preset === "CUSTOM") {
    return { from: new Date(date.from).toISOString(), to: new Date(date.to).toISOString() };
  }
  return toIsoBoundsForPreset(date.preset);
}

export function toIsoBoundsForPreset(
  preset?: FilterDatePreset,
  customFrom?: string,
  customTo?: string,
): { from?: string; to?: string } | null {
  const now = new Date();

  if (preset === "CUSTOM") {
    const from = customFrom ? new Date(customFrom) : undefined;
    const to = customTo ? new Date(customTo) : undefined;
    if (!from && !to) return null;
    return {
      from: from?.toISOString(),
      to: to?.toISOString(),
    };
  }

  if (preset === "TODAY") {
    return {
      from: startOfDay(now).toISOString(),
      to: now.toISOString(),
    };
  }

  if (preset === "YESTERDAY") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return {
      from: startOfDay(yesterday).toISOString(),
      to: endOfDay(yesterday).toISOString(),
    };
  }

  if (preset === "THIS_WEEK") {
    return {
      from: startOfWeek(now).toISOString(),
      to: now.toISOString(),
    };
  }

  if (preset === "LAST_WEEK") {
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    return {
      from: startOfWeek(lastWeek).toISOString(),
      to: endOfWeek(lastWeek).toISOString(),
    };
  }

  if (preset === "THIS_MONTH") {
    return {
      from: startOfMonth(now.getFullYear(), now.getMonth()).toISOString(),
      to: now.toISOString(),
    };
  }

  if (preset === "LAST_MONTH") {
    const month = now.getMonth() - 1;
    const year = month < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const adjustedMonth = month < 0 ? 11 : month;
    return {
      from: startOfMonth(year, adjustedMonth).toISOString(),
      to: endOfMonth(year, adjustedMonth).toISOString(),
    };
  }

  if (preset === "LAST_6_MONTHS") {
    const from = new Date(now);
    from.setMonth(now.getMonth() - 6);
    from.setDate(1);
    return {
      from: startOfDay(from).toISOString(),
      to: now.toISOString(),
    };
  }

  if (preset === "THIS_YEAR") {
    return {
      from: startOfMonth(now.getFullYear(), 0).toISOString(),
      to: now.toISOString(),
    };
  }

  if (preset === "LAST_YEAR") {
    const year = now.getFullYear() - 1;
    return {
      from: startOfMonth(year, 0).toISOString(),
      to: endOfMonth(year, 11).toISOString(),
    };
  }

  return null;
}
