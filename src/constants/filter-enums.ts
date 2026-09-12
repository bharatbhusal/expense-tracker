// ─────────────────────────────────────────────
// Filter / search enums — single source of truth.
// String-union types in `@/constants/types/search.types` derive from these,
// and `@/lib/validators` feeds them straight into zod. Add a value here and
// it flows to types, validation, and query builders together.
// ─────────────────────────────────────────────

const SORT_DIRECTIONS = ["ASC", "DESC"] as const;

const BUCKET_PRESETS = ["PERSONAL", "ALL", "MULTIPLE"] as const;

const OWNER_PRESETS = ["ME", "ALL", "MULTIPLE"] as const;

const CATEGORY_PRESETS = ["ALL", "MULTIPLE"] as const;

const NON_CUSTOM_DATE_PRESETS = [
  "TODAY",
  "YESTERDAY",
  "THIS_WEEK",
  "LAST_WEEK",
  "THIS_MONTH",
  "LAST_MONTH",
  "LAST_6_MONTHS",
  "THIS_YEAR",
  "LAST_YEAR",
] as const;

const DATE_PRESETS = [...NON_CUSTOM_DATE_PRESETS, "CUSTOM"] as const;

const DISTRIBUTION_DIMENSIONS = ["category", "owner", "bucket"] as const;

const EXPENSE_SORTABLE_FIELDS = ["paidAt", "amount", "createdAt", "title"] as const;

const CATEGORY_SORTABLE_FIELDS = ["name", "createdAt", "amount"] as const;

const BUCKET_SORTABLE_FIELDS = ["createdAt", "name", "totalAmount", "memberCount"] as const;

const AUDIT_SORTABLE_FIELDS = ["timestamp", "action", "entity"] as const;

export {
  SORT_DIRECTIONS,
  BUCKET_PRESETS,
  OWNER_PRESETS,
  CATEGORY_PRESETS,
  NON_CUSTOM_DATE_PRESETS,
  DATE_PRESETS,
  DISTRIBUTION_DIMENSIONS,
  EXPENSE_SORTABLE_FIELDS,
  CATEGORY_SORTABLE_FIELDS,
  BUCKET_SORTABLE_FIELDS,
  AUDIT_SORTABLE_FIELDS,
};
