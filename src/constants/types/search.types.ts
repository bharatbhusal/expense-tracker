import type {
  BUCKET_PRESETS,
  CATEGORY_PRESETS,
  DATE_PRESETS,
  DISTRIBUTION_DIMENSIONS,
  NON_CUSTOM_DATE_PRESETS,
  OWNER_PRESETS,
  SORT_DIRECTIONS,
} from "@/constants/filter-enums";

export {
  EXPENSE_SORTABLE_FIELDS,
  CATEGORY_SORTABLE_FIELDS,
  BUCKET_SORTABLE_FIELDS,
  AUDIT_SORTABLE_FIELDS,
} from "@/constants/filter-enums";

export type BucketPreset = (typeof BUCKET_PRESETS)[number];
export type OwnerPreset = (typeof OWNER_PRESETS)[number];
export type CategoryPreset = (typeof CATEGORY_PRESETS)[number];
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export type FilterDatePreset = (typeof DATE_PRESETS)[number];

export type DatePreset = (typeof NON_CUSTOM_DATE_PRESETS)[number];

// ponytail: discriminated unions make CUSTOM-without-range and
// MULTIPLE-without-ids unrepresentable instead of silently ignored.
export type DateFilter = { preset: DatePreset } | { preset: "CUSTOM"; from: string; to: string };

export type BucketSelection =
  { preset: "PERSONAL" } | { preset: "ALL" } | { preset: "MULTIPLE"; ids: string[] };

export type OwnerSelection =
  { preset: "ME" } | { preset: "ALL" } | { preset: "MULTIPLE"; ids: string[] };

export type CategorySelection = { preset: "ALL" } | { preset: "MULTIPLE"; ids: string[] };

export interface PaginationCriteria {
  page: number;
  pageSize: number;
}

export interface SortCriteria {
  field: string;
  direction: SortDirection;
}

// Server-side auth context — ME/PERSONAL resolve from here, never from client input.
export interface QueryContext {
  userId: string;
}

export interface ExpenseFilterCriteria {
  bucket: BucketSelection;
  category: CategorySelection;
  owner: OwnerSelection;
  date: DateFilter;
  hasNotes?: boolean;
  hasLocation?: boolean;
  q?: string;
}

export interface CategoryFilterCriteria {
  bucket: BucketSelection;
  owner: OwnerSelection;
  date?: DateFilter;
  q?: string;
}

export interface AuditFilterCriteria {
  bucket: BucketSelection;
  owner: OwnerSelection;
  date: DateFilter;
}

// ponytail: bucket list membership is auth-derived; date/owner only scope the
// per-bucket expense totals, never the membership list itself.
export interface BucketFilterCriteria {
  date: DateFilter;
  owner?: OwnerSelection;
}

export type SearchRequest<TFilter> = {
  filterCriteria: TFilter;
  sortCriteria: SortCriteria;
  pagination: PaginationCriteria;
};

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export type ExpenseSearchRequest = SearchRequest<ExpenseFilterCriteria>;
export type CategorySearchRequest = SearchRequest<CategoryFilterCriteria>;
export type BucketSearchRequest = SearchRequest<BucketFilterCriteria>;
export type AuditSearchRequest = SearchRequest<AuditFilterCriteria>;

export type DistributionDimension = (typeof DISTRIBUTION_DIMENSIONS)[number];

export type DistributionRequest = {
  dimension: DistributionDimension;
  filterCriteria: ExpenseFilterCriteria;
};
