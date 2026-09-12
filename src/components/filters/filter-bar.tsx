"use client";

import { useState } from "react";
import { FiFilter } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { DateDropdown } from "./date-dropdown";
import { SortDropdown } from "./sort-dropdown";
import { FilterDialog } from "./filter-dialog";
import { resolveSections, type FilterVariant, type SectionFlags } from "./variants";

type FilterBarProps = {
  variant: FilterVariant;
  sections?: Partial<SectionFlags>;
};

export function FilterBar({ variant, sections }: FilterBarProps) {
  const [open, setOpen] = useState(false);
  const resolvedSections = resolveSections(variant, sections);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Open filters"
          onClick={() => setOpen(true)}
          className="shrink-0"
        >
          <FiFilter aria-hidden="true" className="h-4 w-4" />
        </Button>

        <div className="scrollbar-hide flex flex-1 items-center gap-2 overflow-x-auto">
          {resolvedSections.date ? (
            <DateDropdown variant={variant} onCustomOpen={() => setOpen(true)} />
          ) : null}
          {resolvedSections.sort ? <SortDropdown variant={variant} /> : null}
        </div>
      </div>

      <FilterDialog
        variant={variant}
        open={open}
        onClose={() => setOpen(false)}
        sections={sections}
      />
    </>
  );
}
