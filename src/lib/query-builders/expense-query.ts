import { EXPENSE_SORTABLE_FIELDS } from "@/constants/types/search.types";
import type { ExpenseSearchRequest } from "@/constants/types/search.types";
import {
  applyBucketScope,
  applyCategoryFilter,
  applyDateFilter,
  applyOwnerFilter,
  buildPaging,
  buildSort,
  searchRegex,
  type MongoFilter,
  type MongoSort,
} from "@/lib/query-builders/shared";

export async function buildExpenseQuery(
  userId: string,
  request: ExpenseSearchRequest,
): Promise<{
  query: MongoFilter;
  sort: MongoSort;
  skip: number;
  limit: number;
}> {
  const ctx = { userId };
  const filters = request.filterCriteria;
  const query: MongoFilter = {};

  await applyBucketScope(query, ctx, filters.bucket);
  applyCategoryFilter(query, filters.category);
  applyOwnerFilter(query, "userId", ctx, filters.owner);
  applyDateFilter(query, "paidAt", filters.date);

  const and: MongoFilter[] = [];

  const regex = searchRegex(filters.q);
  if (regex) {
    and.push({ $or: [{ title: regex }, { notes: regex }] });
  }

  if (filters.hasNotes !== undefined) {
    and.push(
      filters.hasNotes
        ? { notes: { $exists: true, $nin: ["", null] } }
        : { $or: [{ notes: { $exists: false } }, { notes: { $in: ["", null] } }] },
    );
  }

  // location is required in the schema, so "no location" is the sentinel 0/0.
  // ponytail: $ne also matches missing fields, so pair it with $exists for
  // legacy documents written before location was required.
  if (filters.hasLocation !== undefined) {
    and.push(
      filters.hasLocation
        ? {
            $or: [
              { "location.latitude": { $exists: true, $ne: 0 } },
              { "location.longitude": { $exists: true, $ne: 0 } },
            ],
          }
        : {
            $or: [
              { "location.latitude": { $exists: false } },
              { "location.latitude": 0, "location.longitude": 0 },
            ],
          },
    );
  }

  if (and.length > 0) {
    query.$and = and;
  }

  return {
    query,
    sort: buildSort(EXPENSE_SORTABLE_FIELDS, request.sortCriteria),
    ...buildPaging(request.pagination),
  };
}
