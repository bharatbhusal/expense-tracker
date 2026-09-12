"use client";

import { FiArrowDown, FiArrowUp } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FilterSection } from "./section";
import type { SortDirection } from "@/constants/types/search.types";

export type SortField = { value: string; label: string };

type SortSectionProps = {
  field: string;
  direction: SortDirection;
  fields: SortField[];
  onChange: (next: { field: string; direction: SortDirection }) => void;
  onClear: () => void;
  defaultOpen?: boolean;
};

export function SortSection({
  field,
  direction,
  fields,
  onChange,
  onClear,
  defaultOpen,
}: SortSectionProps) {
  return (
    <FilterSection title="Sort" onClear={onClear} defaultOpen={defaultOpen}>
      <div className="flex items-center gap-2">
        <Select
          aria-label="Sort field"
          value={field}
          onChange={(e) => onChange({ field: e.target.value, direction })}
        >
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={direction === "ASC" ? "Sort ascending" : "Sort descending"}
          onClick={() =>
            onChange({
              field,
              direction: direction === "ASC" ? "DESC" : "ASC",
            })
          }
          className="shrink-0"
        >
          {direction === "ASC" ? (
            <FiArrowUp aria-hidden="true" className="h-4 w-4" />
          ) : (
            <FiArrowDown aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
      </div>
    </FilterSection>
  );
}
