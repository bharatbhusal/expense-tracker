import type { BucketSummary } from "@/constants/types/bucket.types";
import type {
  AuditFilterCriteria,
  BucketFilterCriteria,
  CategoryFilterCriteria,
  CategorySearchRequest,
  DateFilter,
  ExpenseFilterCriteria,
  ExpenseSearchRequest,
  FilterDatePreset,
} from "@/constants/types/search.types";
import { SECTIONS, type FilterVariant } from "@/components/filters/variants";

// per-variant omit disabled sections before API — disabled bucket/category/owner/search/additional fields are not sent
export function stripCriteriaForVariant(
  variant: FilterVariant,
  criteria: Record<string, unknown>,
): Record<string, unknown> {
  const flags = SECTIONS[variant];
  const out: Record<string, unknown> = { ...criteria };
  if (!flags.buckets) {
    delete out.bucket;
  }
  if (!flags.categories) {
    delete out.category;
  }
  if (!flags.owners) {
    delete out.owner;
  }
  if (!flags.search) delete out.q;
  if (!flags.additional) {
    delete out.hasNotes;
    delete out.hasLocation;
  }
  if (!flags.date) {
    delete out.date;
  }
  return out;
}

export function expenseCriteriaForVariant(
  variant: FilterVariant,
  c: ExpenseFilterCriteria,
): ExpenseFilterCriteria {
  const stripped = stripCriteriaForVariant(variant, c as unknown as Record<string, unknown>);
  return stripped as unknown as ExpenseFilterCriteria;
}

export function categoryCriteria(
  c: ExpenseFilterCriteria | CategoryFilterCriteria,
  variant: FilterVariant = "categories",
): CategoryFilterCriteria {
  const base: CategoryFilterCriteria = {
    bucket: (c as ExpenseFilterCriteria).bucket ?? { preset: "ALL" },
    owner: (c as ExpenseFilterCriteria).owner ?? { preset: "ALL" },
    date: c.date,
    q: (c as ExpenseFilterCriteria).q,
  };
  const stripped = stripCriteriaForVariant(variant, base as unknown as Record<string, unknown>);
  return stripped as unknown as CategoryFilterCriteria;
}

export function auditCriteria(
  c: ExpenseFilterCriteria | AuditFilterCriteria,
  variant: FilterVariant = "logs",
): AuditFilterCriteria {
  const expense = c as ExpenseFilterCriteria;
  const audit = c as AuditFilterCriteria;
  const base: AuditFilterCriteria = {
    bucket: expense.bucket ?? { preset: "ALL" },
    owner: expense.owner ?? { preset: "ALL" },
    date: audit.date ?? expense.date ?? { preset: "THIS_MONTH" },
  };
  const stripped = stripCriteriaForVariant(variant, base as unknown as Record<string, unknown>);
  return stripped as unknown as AuditFilterCriteria;
}

export function bucketCriteria(
  c: ExpenseFilterCriteria | BucketFilterCriteria,
  variant: FilterVariant = "buckets",
): BucketFilterCriteria {
  const base: BucketFilterCriteria = {
    date: c.date ?? { preset: "THIS_MONTH" },
    owner: (c as ExpenseFilterCriteria).owner,
  };
  const stripped = stripCriteriaForVariant(variant, base as unknown as Record<string, unknown>);
  return stripped as unknown as BucketFilterCriteria;
}

// ponytail: the stats/chart/distribution endpoints still demand a concrete
export function filterBounds(bounds: { from?: string; to?: string } | null): {
  from: string;
  to: string;
} {
  return {
    from: bounds?.from ?? new Date(0).toISOString(),
    to: bounds?.to ?? new Date().toISOString(),
  };
}

export function chartGranularity(date: DateFilter | FilterDatePreset): string {
  const preset = typeof date === "string" ? date : date.preset;
  if (preset === "TODAY" || preset === "YESTERDAY") return "day";
  if (preset === "THIS_YEAR" || preset === "LAST_YEAR") return "year";
  return "month";
}

export function personalBucketId(buckets: BucketSummary[]): string {
  return buckets.find((b) => b.isPersonal)?._id ?? buckets[0]?._id ?? "";
}

export function scopedCategoryRequest(bucketId: string): CategorySearchRequest {
  return {
    filterCriteria: {
      bucket: { preset: "MULTIPLE", ids: [bucketId] },
      owner: { preset: "ALL" },
    },
    sortCriteria: { field: "createdAt", direction: "DESC" },
    pagination: { page: 1, pageSize: 100 },
  };
}

// ponytail: detail views need "other expenses in this category", which is not
// what the page-wide filter state describes — so they build their own request.
export function scopedExpenseRequest({
  bucketId,
  categoryId,
  page,
  pageSize = 20,
  from,
  to,
}: {
  bucketId?: string;
  categoryId: string;
  page: number;
  pageSize?: number;
  from?: string;
  to?: string;
}): ExpenseSearchRequest {
  return {
    filterCriteria: {
      bucket: bucketId ? { preset: "MULTIPLE", ids: [bucketId] } : { preset: "ALL" },
      category: { preset: "MULTIPLE", ids: [categoryId] },
      owner: { preset: "ALL" },
      date: from && to ? { preset: "CUSTOM", from, to } : { preset: "THIS_MONTH" },
    },
    sortCriteria: { field: "paidAt", direction: "DESC" },
    pagination: { page, pageSize },
  };
}
