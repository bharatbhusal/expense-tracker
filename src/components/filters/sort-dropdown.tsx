"use client";

import { DropdownList } from "@/components/ui/dropdown-list";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { SortDirection } from "@/constants/types/search.types";
import type { FilterVariant } from "./variants";
import { ACTIONS, SORT_FIELDS, sortFieldLabel, sortForVariant } from "./variants";

type SortDropdownProps = {
  variant: FilterVariant;
};

export function SortDropdown({ variant }: SortDropdownProps) {
  const dispatch = useAppDispatch();
  const sliceState = useAppSelector((s) => (s.filters as Record<string, any>)[variant]);
  const sortCriteria = sortForVariant(variant, sliceState.sortCriteria);

  const setSort = (next: { field: string; direction: SortDirection }) => {
    dispatch(ACTIONS[variant].setSort!(next));
  };

  const options = SORT_FIELDS[variant].flatMap((f) =>
    (["DESC", "ASC"] as const).map((d) => ({
      value: `${f.value}:${d}`,
      label: `${sortFieldLabel(variant, f.value)} ${d === "DESC" ? "↓" : "↑"}`,
    })),
  );

  return (
    <DropdownList
      aria-label="Sort expenses"
      value={`${sortCriteria.field}:${sortCriteria.direction}`}
      onValueChange={(v) => {
        const [field, direction] = v.split(":");
        setSort({ field, direction: direction === "ASC" ? "ASC" : "DESC" });
      }}
      options={options}
      className="w-40 px-2 py-1.5 text-sm"
    />
  );
}
