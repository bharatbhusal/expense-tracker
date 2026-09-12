import { CATEGORY_SORTABLE_FIELDS } from "@/constants/types/search.types";
import type { CategorySearchRequest } from "@/constants/types/search.types";
import {
  applyBucketScope,
  applyDateFilter,
  applyOwnerFilter,
  buildPaging,
  buildSort,
  searchRegex,
  type MongoFilter,
  type MongoSort,
} from "@/lib/query-builders/shared";

export async function buildCategoryQuery(
  userId: string,
  request: CategorySearchRequest,
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
  applyOwnerFilter(query, "userId", ctx, filters.owner);
  applyDateFilter(query, "createdAt", filters.date);

  const regex = searchRegex(filters.q);
  if (regex) {
    query.name = regex;
  }

  return {
    query,
    sort: buildSort(CATEGORY_SORTABLE_FIELDS, request.sortCriteria),
    ...buildPaging(request.pagination),
  };
}
