import { AUDIT_SORTABLE_FIELDS } from "@/constants/types/search.types";
import type { AuditSearchRequest } from "@/constants/types/search.types";
import {
  applyBucketScope,
  applyDateFilter,
  applyOwnerFilter,
  buildPaging,
  buildSort,
  type MongoFilter,
  type MongoSort,
} from "@/lib/query-builders/shared";

export async function buildAuditQuery(
  userId: string,
  request: AuditSearchRequest,
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
  applyOwnerFilter(query, "actorId", ctx, filters.owner);
  applyDateFilter(query, "timestamp", filters.date);

  return {
    query,
    sort: buildSort(AUDIT_SORTABLE_FIELDS, request.sortCriteria),
    ...buildPaging(request.pagination),
  };
}
