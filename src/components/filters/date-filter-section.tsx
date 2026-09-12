"use client";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { FilterSection } from "./section";
import { presetLabel } from "@/lib/date-range";
import { getLocalDateTimeInputValue, toUtcIsoString } from "@/lib/datetime";
import type { DateFilter, FilterDatePreset } from "@/constants/types/search.types";

export const PRESETS: FilterDatePreset[] = [
  "TODAY",
  "YESTERDAY",
  "THIS_WEEK",
  "LAST_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "LAST_6_MONTHS",
  "THIS_YEAR",
  "LAST_YEAR",
  "CUSTOM",
];

type DateFilterSectionProps = {
  value: DateFilter;
  onChange: (next: DateFilter) => void;
  onClear: () => void;
  defaultOpen?: boolean;
};

function toInputValue(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return getLocalDateTimeInputValue(date);
}

export function DateFilterSection({
  value,
  onChange,
  onClear,
  defaultOpen,
}: DateFilterSectionProps) {
  const preset = value.preset;
  const customFrom = value.preset === "CUSTOM" ? value.from : undefined;
  const customTo = value.preset === "CUSTOM" ? value.to : undefined;
  const isCustom = preset === "CUSTOM";

  // ponytail: the datetime-local value is a bare "2026-01-05T14:30" that the
  // browser treats as local — new Date() keeps it local, so toISOString()
  // lands on the right UTC instant with no day shift.
  const setBound = (key: "from" | "to", inputValue: string) =>
    onChange({
      preset: "CUSTOM",
      from:
        key === "from"
          ? inputValue
            ? toUtcIsoString(inputValue)
            : (customFrom ?? new Date().toISOString())
          : (customFrom ?? new Date().toISOString()),
      to:
        key === "to"
          ? inputValue
            ? toUtcIsoString(inputValue)
            : (customTo ?? new Date().toISOString())
          : (customTo ?? new Date().toISOString()),
    });

  return (
    <FilterSection title="Date" onClear={onClear} defaultOpen={defaultOpen}>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const selected = p === preset;
            return (
              <Chip
                key={p}
                label={p === "CUSTOM" ? "Custom Range" : presetLabel(p)}
                variant={selected ? "default" : "muted"}
                onClick={() =>
                  onChange(
                    p === "CUSTOM"
                      ? {
                          preset: p,
                          from: customFrom ?? new Date().toISOString(),
                          to: customTo ?? new Date().toISOString(),
                        }
                      : { preset: p },
                  )
                }
              />
            );
          })}
        </div>
        {isCustom ? (
          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-[var(--color-muted)]">From</span>
              <Input
                type="datetime-local"
                value={toInputValue(customFrom)}
                onChange={(e) => setBound("from", e.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-[var(--color-muted)]">To</span>
              <Input
                type="datetime-local"
                value={toInputValue(customTo)}
                onChange={(e) => setBound("to", e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </FilterSection>
  );
}
