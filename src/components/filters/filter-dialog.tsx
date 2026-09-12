"use client";

import { useEffect, useRef, useState } from "react";

import { ConfirmDialog, Modal } from "@/components/modals/dialog";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { AdditionalFiltersSection } from "./additional-filters-section";
import { BucketCategoryFilterSection } from "./bucket-category-filter-section";
import { DateFilterSection } from "./date-filter-section";
import { OwnerFilterSection } from "./owner-filter-section";
import { SearchSection } from "./search-section";
import { SortSection } from "./sort-section";
import { useAllBucketCategories, useScopedOptions } from "./use-scoped-options";
import {
  ACTIONS,
  SORT_FIELDS,
  VARIANT_TITLE,
  defaultSort,
  resolveSections,
  sortForVariant,
  type DraftCriteria,
  type FilterVariant,
  type SectionFlags,
} from "./variants";
import type { SortCriteria } from "@/constants/types/search.types";

type FilterDialogProps = {
  variant: FilterVariant;
  open: boolean;
  onClose: () => void;
  sections?: Partial<SectionFlags>;
};

export function FilterDialog({
  variant,
  open,
  onClose,
  sections: sectionsOverride,
}: FilterDialogProps) {
  const dispatch = useAppDispatch();
  const actions = ACTIONS[variant];
  const sections = resolveSections(variant, sectionsOverride);

  const sliceState = useAppSelector((s) => (s.filters as Record<string, any>)[variant]);
  const state = sliceState;
  const buckets = useAppSelector((s) => s.buckets.allBuckets);
  const authUser = useAppSelector((s) => s.auth.user);

  const [confirmClear, setConfirmClear] = useState(false);

  const [draft, setDraft] = useState({
    criteria: state.filterCriteria as DraftCriteria,
    sort: sortForVariant(variant, state.sortCriteria),
  });
  // ponytail: re-sync the draft when the dialog opens — in an effect, never
  // setState during render. The transition guard keeps store updates from
  // clobbering in-progress edits while open.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setDraft({
        criteria: state.filterCriteria as DraftCriteria,
        sort: sortForVariant(variant, state.sortCriteria),
      });
    }
    wasOpen.current = open;
  }, [open, state.filterCriteria, state.sortCriteria, variant]);
  const { criteria, sort } = draft;
  const setCriteria = (updater: (c: DraftCriteria) => DraftCriteria) =>
    setDraft((d) => ({ ...d, criteria: updater(d.criteria) }));
  const setSort = (next: SortCriteria) => setDraft((d) => ({ ...d, sort: next }));

  // all bucket categories (for nested list, always load when either buckets or categories section is visible)
  const allBucketCats = useAllBucketCategories(
    open && (sections.buckets || sections.categories),
    buckets,
  );
  // effective ids for scoped owners (empty MULTIPLE => all, keep legacy compat)
  const effectiveBucketIdsForOwners = (() => {
    const bucket = (criteria as any).bucket as { preset: string; ids?: string[] } | undefined;
    if (bucket?.preset === "PERSONAL") {
      const pid = buckets.find((b) => b.isPersonal)?._id;
      return pid ? [pid] : [];
    }
    if (!bucket || bucket.preset === "ALL") return buckets.map((b) => b._id);
    if (bucket.ids && bucket.ids.length > 0) return bucket.ids;
    return buckets.map((b) => b._id);
  })();

  const scoped = useScopedOptions(open && sections.owners, buckets, {
    preset: "MULTIPLE",
    ids: effectiveBucketIdsForOwners,
  });

  const patch = (next: Partial<DraftCriteria>) => setCriteria((c) => ({ ...c, ...next }));

  // helpers to normalize draft selections to explicit id lists
  const effectiveBucketIds = (() => {
    const bucket = (criteria as any).bucket as { preset: string; ids?: string[] } | undefined;
    if (bucket?.preset === "PERSONAL") {
      const pid = buckets.find((b) => b.isPersonal)?._id;
      return pid ? [pid] : [];
    }
    if (!bucket || bucket.preset === "ALL") return buckets.map((b) => b._id);
    if (bucket.ids && bucket.ids.length > 0) return bucket.ids;
    return buckets.map((b) => b._id);
  })();

  const effectiveCategoryIds = (() => {
    const category = (criteria as any).category as { preset: string; ids?: string[] } | undefined;
    if (!category || category.preset === "ALL") {
      return [
        ...new Set(
          Object.values(allBucketCats.categoriesByBucket)
            .flat()
            .map((c) => c._id),
        ),
      ];
    }
    return category.ids ?? [];
  })();

  const effectiveOwnerIds = (() => {
    const owner = (criteria as any).owner as { preset: string; ids?: string[] } | undefined;
    if (owner?.preset === "ME") return authUser?.id ? [authUser.id] : [];
    if (!owner || owner.preset === "ALL") return scoped.owners.map((o) => o.id);
    return owner.ids ?? [];
  })();

  const bucketCategoryLoading = allBucketCats.isLoading || scoped.isLoading;

  const apply = () => {
    // ids-only: always MULTIPLE (preset is legacy, we force MULTIPLE)
    const showBuckets = sections.buckets || sections.categories;
    if (showBuckets && actions.setBucketFilter) {
      dispatch(
        actions.setBucketFilter({
          preset: "MULTIPLE",
          ids: effectiveBucketIds,
        }),
      );
    }
    if (sections.categories && actions.setCategoryFilter) {
      dispatch(
        actions.setCategoryFilter({
          preset: "MULTIPLE",
          ids: effectiveCategoryIds,
        }),
      );
    }
    if (sections.owners && actions.setOwnerFilter) {
      dispatch(
        actions.setOwnerFilter({
          preset: "MULTIPLE",
          ids: effectiveOwnerIds,
        }),
      );
    }
    if (sections.date && actions.setDateFilter) {
      dispatch(actions.setDateFilter({ date: criteria.date }));
    }
    if (sections.search && actions.setSearch) {
      dispatch(actions.setSearch(criteria.q));
    }
    if (sections.additional) {
      if (actions.setHasNotes) dispatch(actions.setHasNotes(criteria.hasNotes));
      if (actions.setHasLocation) dispatch(actions.setHasLocation(criteria.hasLocation));
    }
    if (sections.sort && actions.setSort) dispatch(actions.setSort(sort));
    onClose();
  };

  const clearAll = () => {
    // ponytail: clear to personal bucket + its categories (ids-only), not preset ALL
    const personalId = buckets.find((b) => b.isPersonal)?._id ?? buckets[0]?._id;
    if (personalId) {
      const personalCatIds = (allBucketCats.categoriesByBucket[personalId] ?? []).map((c) => c._id);
      if (actions.setBucketFilter)
        dispatch(actions.setBucketFilter({ preset: "MULTIPLE", ids: [personalId] }));
      if (sections.categories && actions.setCategoryFilter)
        dispatch(actions.setCategoryFilter({ preset: "MULTIPLE", ids: personalCatIds }));
      else if (actions.setCategoryFilter)
        dispatch(actions.setCategoryFilter({ preset: "MULTIPLE", ids: [] }));
    } else {
      if (actions.clearBucketFilter) dispatch(actions.clearBucketFilter());
      if (actions.clearCategoryFilter) dispatch(actions.clearCategoryFilter());
    }
    if (sections.owners && actions.setOwnerFilter) {
      const meId = authUser?.id;
      if (meId) dispatch(actions.setOwnerFilter({ preset: "MULTIPLE", ids: [meId] }));
      else if (actions.clearOwnerFilter) dispatch(actions.clearOwnerFilter());
    } else if (actions.clearOwnerFilter) {
      dispatch(actions.clearOwnerFilter());
    }
    if (sections.date && actions.clearDateFilter) dispatch(actions.clearDateFilter());
    if (sections.search && actions.setSearch) dispatch(actions.setSearch(undefined));
    if (sections.additional && actions.clearAdditionalFilters)
      dispatch(actions.clearAdditionalFilters());
    if (sections.sort && actions.clearSort) dispatch(actions.clearSort());
    setConfirmClear(false);
    onClose();
  };

  const handleBucketCategoryClear = () => {
    const personalId = buckets.find((b) => b.isPersonal)?._id ?? buckets[0]?._id;
    if (!personalId) {
      patch({
        bucket: { preset: "MULTIPLE", ids: [] },
        category: { preset: "MULTIPLE", ids: [] },
      });
      return;
    }
    const personalCatIds = (allBucketCats.categoriesByBucket[personalId] ?? []).map((c) => c._id);
    patch({
      bucket: { preset: "MULTIPLE", ids: [personalId] },
      category: { preset: "MULTIPLE", ids: personalCatIds },
    });
  };

  return (
    <>
      <Modal
        open={open}
        title={VARIANT_TITLE[variant]}
        subtitle="Narrow down what you see"
        onClose={onClose}
      >
        <div className="space-y-5">
          {sections.search ? (
            <SearchSection
              q={criteria.q ?? ""}
              onChange={(q) => setCriteria((c) => ({ ...c, q: q || undefined }))}
            />
          ) : null}

          {sections.owners ? (
            <OwnerFilterSection
              ownerIds={effectiveOwnerIds}
              owners={scoped.owners}
              isLoading={scoped.isLoading}
              onChange={(ids) => patch({ owner: { preset: "MULTIPLE", ids } })}
              onClear={() => {
                const meId = authUser?.id;
                patch({ owner: { preset: "MULTIPLE", ids: meId ? [meId] : [] } });
              }}
            />
          ) : null}

          {sections.buckets || sections.categories ? (
            <BucketCategoryFilterSection
              buckets={buckets}
              bucketIds={effectiveBucketIds}
              categoryIds={effectiveCategoryIds}
              categoriesByBucket={allBucketCats.categoriesByBucket}
              isLoading={bucketCategoryLoading}
              categoriesEnabled={!!sections.categories}
              onBucketIdsChange={(ids) => patch({ bucket: { preset: "MULTIPLE", ids } })}
              onCategoryIdsChange={(ids) => patch({ category: { preset: "MULTIPLE", ids } })}
              onClear={handleBucketCategoryClear}
            />
          ) : null}

          {sections.date ? (
            <DateFilterSection
              value={criteria.date}
              onChange={(date) => setCriteria((c) => ({ ...c, date }))}
              onClear={() => setCriteria((c) => ({ ...c, date: { preset: "THIS_MONTH" } }))}
              defaultOpen={true}
            />
          ) : null}

          {sections.sort ? (
            <SortSection
              field={sort.field}
              direction={sort.direction}
              fields={SORT_FIELDS[variant]}
              onChange={setSort}
              onClear={() => setSort(defaultSort(variant))}
              defaultOpen={false}
            />
          ) : null}

          {sections.additional ? (
            <AdditionalFiltersSection
              hasNotes={criteria.hasNotes}
              hasLocation={criteria.hasLocation}
              onChange={({ hasNotes, hasLocation }) =>
                setCriteria((c) => ({ ...c, hasNotes, hasLocation }))
              }
              onClear={() =>
                setCriteria((c) => ({ ...c, hasNotes: undefined, hasLocation: undefined }))
              }
              defaultOpen={false}
            />
          ) : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="ghost" onClick={() => setConfirmClear(true)}>
              Clear all
            </Button>
            <Button type="button" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all filters"
        subtitle="This resets every filter"
        description="All selected buckets, categories, users, dates and sorting will be reset to their defaults."
        onConfirm={clearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}
