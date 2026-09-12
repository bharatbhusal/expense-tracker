import type { UnknownAction } from "@reduxjs/toolkit";

import * as filtersSlice from "@/store/slices/filtersSlice";
import type {
  BucketSelection,
  CategorySelection,
  DateFilter,
  ExpenseFilterCriteria,
  OwnerSelection,
  PaginationCriteria,
  SortCriteria,
  SortDirection,
} from "@/constants/types/search.types";
import type { SortField } from "./sort-section";

export type FilterVariant =
  "expenses" | "expense" | "categories" | "category" | "buckets" | "bucket" | "logs";

export type DraftCriteria = Partial<ExpenseFilterCriteria> & {
  date: DateFilter;
};

export type FilterValue = {
  filterCriteria: DraftCriteria;
  sortCriteria: SortCriteria;
};

export type FilterSliceState = FilterValue & {
  pagination: PaginationCriteria;
};

type FilterActions = {
  setBucketFilter?: (p: { preset: BucketSelection["preset"]; ids: string[] }) => UnknownAction;
  setCategoryFilter?: (p: { preset: CategorySelection["preset"]; ids: string[] }) => UnknownAction;
  setOwnerFilter?: (p: { preset: OwnerSelection["preset"]; ids: string[] }) => UnknownAction;
  setDateFilter?: (p: { date: DateFilter }) => UnknownAction;
  setSort?: (p: { field: string; direction: SortDirection }) => UnknownAction;
  setSearch?: (p: string | undefined) => UnknownAction;
  setHasNotes?: (p: boolean | undefined) => UnknownAction;
  setHasLocation?: (p: boolean | undefined) => UnknownAction;
  clearBucketFilter?: () => UnknownAction;
  clearCategoryFilter?: () => UnknownAction;
  clearOwnerFilter?: () => UnknownAction;
  clearDateFilter?: () => UnknownAction;
  clearSort?: () => UnknownAction;
  clearAdditionalFilters?: () => UnknownAction;
  clearAllFilters?: () => UnknownAction;
};

// per-variant isolated — SLICE_KEY kept for backward imports but state is s.filters[variant]
export const SLICE_KEY: Record<FilterVariant, string> = {
  expenses: "filters",
  expense: "filters",
  categories: "filters",
  category: "filters",
  buckets: "filters",
  bucket: "filters",
  logs: "filters",
};

function makeActions(variant: FilterVariant): FilterActions {
  return {
    setBucketFilter: (p) => filtersSlice.setBucketFilter({ variant, ...p }),
    setCategoryFilter: (p) => filtersSlice.setCategoryFilter({ variant, ...p }),
    setOwnerFilter: (p) => filtersSlice.setOwnerFilter({ variant, ...p }),
    setDateFilter: (p) => filtersSlice.setDateFilter({ variant, ...p }),
    setSort: (p) => filtersSlice.setSort({ variant, ...p }),
    setSearch: (p) => filtersSlice.setSearch({ variant, q: p }),
    setHasNotes: (p) => filtersSlice.setHasNotes({ variant, value: p }),
    setHasLocation: (p) => filtersSlice.setHasLocation({ variant, value: p }),
    clearBucketFilter: () => filtersSlice.clearBucketFilter({ variant }),
    clearCategoryFilter: () => filtersSlice.clearCategoryFilter({ variant }),
    clearOwnerFilter: () => filtersSlice.clearOwnerFilter({ variant }),
    clearDateFilter: () => filtersSlice.clearDateFilter({ variant }),
    clearSort: () => filtersSlice.clearSort({ variant }),
    clearAdditionalFilters: () => filtersSlice.clearAdditionalFilters({ variant }),
    clearAllFilters: () => filtersSlice.clearAllFilters({ variant }),
  };
}

export const ACTIONS: Record<FilterVariant, FilterActions> = {
  expenses: makeActions("expenses"),
  expense: makeActions("expense"),
  categories: makeActions("categories"),
  category: makeActions("category"),
  buckets: makeActions("buckets"),
  bucket: makeActions("bucket"),
  logs: makeActions("logs"),
};

export type SectionName =
  "buckets" | "categories" | "owners" | "additional" | "search" | "date" | "sort";

export type SectionFlags = Record<SectionName, boolean>;

export const SECTIONS: Record<FilterVariant, SectionFlags> = {
  expenses: {
    buckets: true,
    categories: true,
    owners: false,
    additional: false,
    search: true,
    date: true,
    sort: true,
  },
  expense: {
    buckets: true,
    categories: true,
    owners: false,
    additional: false,
    search: true,
    date: true,
    sort: true,
  },
  categories: {
    buckets: true,
    categories: false,
    owners: false,
    additional: false,
    search: false,
    date: true,
    sort: false,
  },
  category: {
    buckets: false,
    categories: false,
    owners: true,
    additional: true,
    search: true,
    date: true,
    sort: true,
  },
  buckets: {
    buckets: false,
    categories: false,
    owners: false,
    additional: false,
    search: false,
    date: true,
    sort: true,
  },
  bucket: {
    buckets: false,
    categories: true,
    owners: true,
    additional: true,
    search: true,
    date: true,
    sort: true,
  },
  logs: {
    buckets: true,
    categories: false,
    owners: false,
    additional: false,
    search: false,
    date: true,
    sort: true,
  },
};

export function resolveSections(
  variant: FilterVariant,
  override?: Partial<SectionFlags>,
): SectionFlags {
  return { ...SECTIONS[variant], ...override };
}

export function defaultSort(variant: FilterVariant): SortCriteria {
  return {
    field: SORT_FIELDS[variant][0].value,
    direction: "DESC",
  };
}

export function sortForVariant(variant: FilterVariant, sort: SortCriteria): SortCriteria {
  return SORT_FIELDS[variant].some((f) => f.value === sort.field) ? sort : defaultSort(variant);
}

export const SORT_FIELDS: Record<FilterVariant, SortField[]> = {
  expenses: [
    { value: "paidAt", label: "Paid At" },
    { value: "amount", label: "Amount" },
  ],
  expense: [
    { value: "paidAt", label: "Paid At" },
    { value: "amount", label: "Amount" },
  ],
  categories: [
    { value: "amount", label: "Amount" },
    { value: "createdAt", label: "Created At" },
  ],
  category: [
    { value: "paidAt", label: "Paid At" },
    { value: "amount", label: "Amount" },
  ],
  buckets: [
    { value: "totalAmount", label: "Total Amount" },
    { value: "memberCount", label: "Members" },
    { value: "createdAt", label: "Created At" },
  ],
  bucket: [
    { value: "paidAt", label: "Paid At" },
    { value: "amount", label: "Amount" },
  ],
  logs: [
    { value: "timestamp", label: "Date" },
    { value: "action", label: "Action" },
    { value: "entity", label: "Entity" },
  ],
};

export const VARIANT_TITLE: Record<FilterVariant, string> = {
  expenses: "Filter expenses",
  expense: "Filter expense",
  categories: "Filter categories",
  category: "Filter category expenses",
  buckets: "Filter buckets",
  bucket: "Filter bucket expenses",
  logs: "Filter logs",
};

export function sortFieldLabel(variant: FilterVariant, field: string): string {
  return SORT_FIELDS[variant].find((f) => f.value === field)?.label ?? field;
}
