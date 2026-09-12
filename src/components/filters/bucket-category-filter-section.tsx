"use client";

import * as React from "react";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { BucketSummary } from "@/constants/types/bucket.types";
import type { CategoryItem } from "@/constants/types/expense.types";

type BucketCategoryFilterSectionProps = {
  buckets: BucketSummary[];
  bucketIds: string[];
  categoryIds: string[];
  categoriesByBucket: Record<string, CategoryItem[]>;
  isLoading?: boolean;
  categoriesEnabled: boolean;
  onBucketIdsChange: (ids: string[]) => void;
  onCategoryIdsChange: (ids: string[]) => void;
  onClear: () => void;
};

const rowClass =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--color-surface-muted)]";

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function BucketCategoryFilterSection({
  buckets,
  bucketIds,
  categoryIds,
  categoriesByBucket,
  isLoading,
  categoriesEnabled,
  onBucketIdsChange,
  onCategoryIdsChange,
  onClear,
}: BucketCategoryFilterSectionProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allBucketIds = buckets.map((b) => b._id);
  const allCategoryIds = dedupe(
    Object.values(categoriesByBucket)
      .flat()
      .map((c) => c._id),
  );

  // ponytail: All reflects buckets + categories combined
  const totalBuckets = allBucketIds.length;
  const totalCats = categoriesEnabled ? allCategoryIds.length : 0;
  const totalItems = totalBuckets + totalCats;
  const selectedItems = bucketIds.length + (categoriesEnabled ? categoryIds.length : 0);
  const allChecked = totalItems > 0 && selectedItems === totalItems;
  const allIndeterminate = selectedItems > 0 && selectedItems < totalItems;

  const allBucketsRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (allBucketsRef.current) allBucketsRef.current.indeterminate = allIndeterminate;
  }, [allIndeterminate]);

  const recomputeBucketIds = (nextCategoryIds: string[]): string[] => {
    if (!categoriesEnabled) return bucketIds;
    return buckets
      .filter((b) => {
        const cats = categoriesByBucket[b._id] ?? [];
        if (cats.length === 0) return bucketIds.includes(b._id);
        return cats.some((c) => nextCategoryIds.includes(c._id));
      })
      .map((b) => b._id);
  };

  const handleAllBucketsChange = (checked: boolean) => {
    if (checked) {
      onBucketIdsChange(dedupe(allBucketIds));
      if (categoriesEnabled) onCategoryIdsChange(dedupe(allCategoryIds));
    } else {
      onBucketIdsChange([]);
      if (categoriesEnabled) onCategoryIdsChange([]);
    }
  };

  const handleBucketToggle = (bucketId: string, checked: boolean) => {
    const catIds = (categoriesByBucket[bucketId] ?? []).map((c) => c._id);
    let nextBucketIds: string[];
    let nextCategoryIds: string[];
    if (checked) {
      nextBucketIds = dedupe([...bucketIds, bucketId]);
      nextCategoryIds = categoriesEnabled ? dedupe([...categoryIds, ...catIds]) : categoryIds;
    } else {
      nextBucketIds = bucketIds.filter((id) => id !== bucketId);
      nextCategoryIds = categoriesEnabled
        ? categoryIds.filter((id) => !catIds.includes(id))
        : categoryIds;
    }
    onBucketIdsChange(nextBucketIds);
    if (categoriesEnabled) onCategoryIdsChange(nextCategoryIds);
  };

  const handleCategoryToggle = (catId: string, checked: boolean, bucketId: string) => {
    void bucketId;
    const nextCats = checked
      ? dedupe([...categoryIds, catId])
      : categoryIds.filter((id) => id !== catId);
    onCategoryIdsChange(nextCats);
    if (categoriesEnabled) {
      onBucketIdsChange(recomputeBucketIds(nextCats));
    }
  };

  const title = categoriesEnabled ? "Buckets & Categories" : "Buckets";

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          {title}
          {isLoading ? <Spinner className="h-3 w-3" /> : null}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="shrink-0 text-[var(--color-muted)]"
        >
          Clear
        </Button>
      </div>

      <div className="max-h-80 space-y-0.5 overflow-y-auto rounded-xl border border-[var(--color-border)] p-1">
        {/* ponytail: single All controls both buckets and categories */}
        <label className={rowClass}>
          <input
            ref={allBucketsRef}
            type="checkbox"
            checked={allChecked}
            onChange={(e) => handleAllBucketsChange(e.target.checked)}
            className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
          />
          <span className="font-medium">All</span>
        </label>

        {buckets.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[var(--color-muted)]">No buckets yet</p>
        ) : null}

        {buckets.map((bucket) => {
          const catList = categoriesByBucket[bucket._id] ?? [];
          const expandable = categoriesEnabled && catList.length > 0;
          const isExpanded = expanded.has(bucket._id);
          // ponytail: indeterminate buckets should click to select all, so checked is everyCat not bucketIds.includes
          const someCats = catList.some((c) => categoryIds.includes(c._id));
          const everyCat = catList.length > 0 && catList.every((c) => categoryIds.includes(c._id));
          const bucketChecked = expandable ? everyCat : bucketIds.includes(bucket._id);
          const bucketIndeterminate = expandable && someCats && !everyCat;

          return (
            <div key={bucket._id} className="space-y-0.5">
              <div className="flex items-center gap-1">
                <label className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--color-surface-muted)]">
                  <input
                    ref={(el) => {
                      if (el) el.indeterminate = bucketIndeterminate;
                    }}
                    type="checkbox"
                    checked={bucketChecked}
                    onChange={(e) => handleBucketToggle(bucket._id, e.target.checked)}
                    className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                  />
                  {bucket.icon ? <span>{bucket.icon}</span> : null}
                  <span className="truncate">{bucket.name}</span>
                </label>
                {expandable ? (
                  <button
                    type="button"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                    onClick={() => toggleExpanded(bucket._id)}
                    className="shrink-0 rounded-lg p-2 hover:bg-[var(--color-surface-muted)]"
                  >
                    {isExpanded ? (
                      <FiChevronUp className="h-4 w-4 text-[var(--color-muted)]" />
                    ) : (
                      <FiChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
                    )}
                  </button>
                ) : null}
              </div>

              {expandable && isExpanded ? (
                <div className="ml-6 space-y-0.5 border-l border-[var(--color-border)] pl-2">
                  {catList.map((cat) => (
                    <label key={cat._id} className={rowClass}>
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(cat._id)}
                        onChange={(e) =>
                          handleCategoryToggle(cat._id, e.target.checked, bucket._id)
                        }
                        className="h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                      />
                      {cat.emoji ? <span>{cat.emoji}</span> : null}
                      <span className="truncate">{cat.name}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
