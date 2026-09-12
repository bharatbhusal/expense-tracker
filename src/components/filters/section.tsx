"use client";

import * as React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type FilterSectionProps = {
  title: string;
  onClear: () => void;
  isLoading?: boolean;
  defaultOpen?: boolean;
  summary?: React.ReactNode;
  children: React.ReactNode;
};

export function FilterSection({
  title,
  onClear,
  isLoading,
  defaultOpen = false,
  children,
}: FilterSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            {title}
            {isLoading ? <Spinner className="h-3 w-3" /> : null}
          </h3>
          {open ? (
            <FiChevronUp aria-hidden="true" className="h-4 w-4 text-[var(--color-muted)]" />
          ) : (
            <FiChevronDown aria-hidden="true" className="h-4 w-4 text-[var(--color-muted)]" />
          )}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="shrink-0 text-[var(--color-muted)]"
        >
          Clear
        </Button>
      </div>
      {open ? children : null}
    </section>
  );
}
