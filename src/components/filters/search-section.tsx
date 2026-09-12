"use client";

import { FiX } from "react-icons/fi";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type SearchSectionProps = {
  q: string;
  onChange: (q: string) => void;
};

export function SearchSection({ q, onChange }: SearchSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="filter-search" className="text-sm font-semibold tracking-tight">
          Search
        </label>
      </div>
      <div className="relative">
        <Input
          id="filter-search"
          type="text"
          placeholder="Search..."
          value={q}
          maxLength={120}
          onChange={(e) => onChange(e.target.value)}
        />
        {q ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center"
          >
            <FiX aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
