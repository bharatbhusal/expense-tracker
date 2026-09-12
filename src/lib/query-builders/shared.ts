import { Types } from "mongoose";

import { ERROR_CODES, FILTER_ERRORS } from "@/constants/error-messages";
import { AppError } from "@/lib/errors";
import { resolveDateRange } from "@/lib/date-range";
import { resolveBucketScope } from "@/lib/query-builders/membership";
import { escapeRegex } from "@/lib/utils";
import type {
  BucketSelection,
  CategorySelection,
  DateFilter,
  OwnerSelection,
  PaginationCriteria,
  QueryContext,
  SortCriteria,
} from "@/constants/types/search.types";

export type MongoFilter = Record<string, unknown>;
export type MongoSort = Record<string, 1 | -1>;

// ponytail: ceiling is O(n) scan of ids; fine for filter lists.
export function toObjectIds(ids: string[]): Types.ObjectId[] {
  return ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
}

export async function applyBucketScope(
  query: MongoFilter,
  ctx: QueryContext,
  selection: BucketSelection,
): Promise<void> {
  query.bucketId = await resolveBucketScope(
    ctx.userId,
    selection.preset,
    selection.preset === "MULTIPLE" ? selection.ids : [],
  );
}

export function applyOwnerFilter(
  query: MongoFilter,
  field: "userId" | "actorId",
  ctx: QueryContext,
  selection: OwnerSelection,
): void {
  if (selection.preset === "ME") {
    query[field] = new Types.ObjectId(ctx.userId);
  } else if (selection.preset === "MULTIPLE") {
    query[field] = { $in: toObjectIds(selection.ids) };
  }
}

export function applyCategoryFilter(query: MongoFilter, selection: CategorySelection): void {
  if (selection.preset === "MULTIPLE") {
    const ids = toObjectIds(selection.ids);
    if (ids.length > 0) query.categoryId = { $in: ids };
  }
}

export function applyDateFilter(
  query: MongoFilter,
  field: "paidAt" | "createdAt" | "timestamp",
  date: DateFilter | undefined,
): void {
  const bounds = resolveDateRange(date);
  if (bounds) {
    query[field] = {
      ...(bounds.from ? { $gte: new Date(bounds.from) } : {}),
      ...(bounds.to ? { $lte: new Date(bounds.to) } : {}),
    };
  }
}

export function searchRegex(q: string | undefined): RegExp | null {
  const trimmed = q?.trim();
  if (!trimmed) return null;
  return new RegExp(escapeRegex(trimmed), "i");
}

export function buildSort(allowlist: readonly string[], criteria: SortCriteria): MongoSort {
  if (!allowlist.includes(criteria.field)) {
    throw new AppError(
      FILTER_ERRORS.INVALID_SORT_FIELD(criteria.field),
      400,
      ERROR_CODES.INVALID_SORT_FIELD,
    );
  }
  return { [criteria.field]: criteria.direction === "ASC" ? 1 : -1 };
}

export function buildPaging(pagination: PaginationCriteria): { skip: number; limit: number } {
  return {
    skip: (pagination.page - 1) * pagination.pageSize,
    limit: pagination.pageSize,
  };
}
