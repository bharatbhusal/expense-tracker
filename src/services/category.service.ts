import { AppError } from "@/lib/errors";
import {
  BUCKET_ERRORS,
  CATEGORY_ERRORS,
  ERROR_CODES,
  USER_ERRORS,
} from "@/constants/error-messages";
import { Types } from "mongoose";
import { getValidBuckets } from "@/lib/query-builders/membership";
import { applyBucketScope, applyOwnerFilter } from "@/lib/query-builders";
import { resolveDateRange } from "@/lib/date-range";
import {
  categoryDistributionSchema,
  categorySchema,
  categorySearchSchema,
  categoryStatsSummarySchema,
} from "@/lib/validators";
import { buildCategoryQuery, buildExpenseQuery } from "@/lib/query-builders";
import {
  createCategory,
  deleteCategory,
  getCategoryByIdForMember,
  listCategoriesWithStats,
  listCategoryIds,
  searchCategories,
  updateCategory,
} from "@/repositories/category.repository";
import expenseRepository from "@/repositories/expense.repository";
import { findBucketById } from "@/repositories/bucket.repository";
import userRepository from "@/repositories/user.repository";
import { logAuditEvent } from "@/services/audit.service";
import { randomHexColor } from "@/lib/utils";
import type { CategoryStatsSummary } from "@/constants/types/analytics.types";
import type { CategorySearchRequest, ExpenseFilterCriteria } from "@/constants/types/search.types";
import { AUDIT_ACTIONS } from "@/constants/types/audit.types";

async function assertCategoryCreator(
  userId: string,
  categoryId: string,
  validBucketIds: Types.ObjectId[],
) {
  const category = await getCategoryByIdForMember(categoryId, validBucketIds);
  if (!category) {
    throw new AppError(CATEGORY_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  if (category.userId.toString() !== userId) {
    throw new AppError(CATEGORY_ERRORS.NOT_OWNER, 403, ERROR_CODES.NOT_OWNER);
  }
  return category;
}

export async function listCategoriesWithStatsService(userId: string, body: unknown) {
  const parsed = categoryStatsSummarySchema.parse(body ?? {});

  const categoryDefaults = defaultCategorySearchRequest();
  const filterCriteria = { ...categoryDefaults.filterCriteria, ...parsed.filterCriteria };

  const sortCriteria = parsed.sortCriteria ?? categoryDefaults.sortCriteria;

  const ctx = { userId };
  const categoryQuery: Record<string, unknown> = {};
  await applyBucketScope(categoryQuery, ctx, filterCriteria.bucket);
  applyOwnerFilter(categoryQuery, "userId", ctx, filterCriteria.owner);

  const bounds = resolveDateRange(filterCriteria.date);

  const from = bounds?.from ? new Date(bounds.from) : new Date(0);

  const to = bounds?.to ? new Date(bounds.to) : new Date();

  return listCategoriesWithStats(categoryQuery, from, to, sortCriteria);
}

export async function createCategoryService(userId: string, body: unknown) {
  const payload = categorySchema.parse(body);

  const validBuckets = await getValidBuckets(userId);
  if (!validBuckets.map((id) => id.toString()).includes(payload.bucketId)) {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }

  const existing = await userRepository.findUserById(userId);
  if (!existing) {
    throw new AppError(USER_ERRORS.DOESNT_EXIST, 409, ERROR_CODES.USER_DOESNT_EXIST);
  }

  const category = await createCategory({
    userId,
    bucketId: payload.bucketId,
    name: payload.name,
    color: payload.color ?? randomHexColor(),
    emoji: payload.emoji,
  });

  await logAuditEvent({
    actorId: userId,
    bucketId: payload.bucketId,
    action: AUDIT_ACTIONS.CREATE,
    entity: "category",
    entityId: category._id.toString(),
    note: `Created category "${category.name}"`,
  });

  return category;
}

export async function getCategoryService(userId: string, categoryId: string) {
  const validBuckets = await getValidBuckets(userId);
  const category = await getCategoryByIdForMember(categoryId, validBuckets);
  if (!category) {
    throw new AppError(CATEGORY_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  return category;
}

export async function updateCategoryService(userId: string, categoryId: string, body: unknown) {
  const payload = categorySchema.parse(body);
  const validBuckets = await getValidBuckets(userId);
  const validSet = new Set(validBuckets.map((id) => id.toString()));

  // creator check — must be member + owner
  const creatorCategory = await assertCategoryCreator(userId, categoryId, validBuckets);
  const currentBucketId = creatorCategory.bucketId.toString();
  const targetBucketId = payload.bucketId;

  if (!validSet.has(targetBucketId)) {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }

  const category = await updateCategory(categoryId, currentBucketId, {
    name: payload.name,
    color: payload.color ?? randomHexColor(),
    emoji: payload.emoji,
    bucketId: targetBucketId,
  });

  if (!category) {
    throw new AppError(CATEGORY_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  if (payload.bucketId && payload.bucketId !== currentBucketId) {
    const sourceId = currentBucketId;
    const destId = targetBucketId;
    const sourceName = (await findBucketById(sourceId))?.name ?? sourceId;
    const destName = (await findBucketById(destId))?.name ?? destId;
    await logAuditEvent({
      actorId: userId,
      bucketId: sourceId,
      action: AUDIT_ACTIONS.OUT,
      entity: "category",
      entityId: category._id.toString(),
      note: `Moved category "${category.name}" to ${destName}`,
    });
    await logAuditEvent({
      actorId: userId,
      bucketId: destId,
      action: AUDIT_ACTIONS.IN,
      entity: "category",
      entityId: category._id.toString(),
      note: `Category "${category.name}" moved from ${sourceName}`,
    });
  } else {
    await logAuditEvent({
      actorId: userId,
      bucketId: currentBucketId,
      action: AUDIT_ACTIONS.UPDATE,
      entity: "category",
      entityId: category._id.toString(),
      note: `Updated category "${category.name}"`,
    });
  }

  return category;
}

export async function deleteCategoryService(userId: string, categoryId: string) {
  const validBuckets = await getValidBuckets(userId);
  const category = await assertCategoryCreator(userId, categoryId, validBuckets);

  const deleted = await deleteCategory(categoryId, category.bucketId.toString());
  if (!deleted) {
    throw new AppError(CATEGORY_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId: category.bucketId.toString(),
    action: AUDIT_ACTIONS.DELETE,
    entity: "category",
    entityId: categoryId,
    note: `Deleted category "${category.name}"`,
  });

  return { message: "Category deleted" };
}

export async function getCategoryStatsService(
  userId: string,
  categoryId: string,
  from: string,
  to: string,
) {
  if (!from || !to) {
    throw new AppError(CATEGORY_ERRORS.FROM_TO_REQUIRED, 400);
  }
  const category = await getCategoryService(userId, categoryId);
  const range = await expenseRepository.getCategoryRangeStats(
    userId,
    categoryId,
    new Date(from),
    new Date(to),
    category.bucketId.toString(),
  );
  return {
    stats: {
      total: range.total,
      count: range.count,
      avg: range.avg,
      min: range.min,
      max: range.max,
      pct: range.pct,
    },
    trend: range.trend,
    ...category,
  };
}

// Full expense filter criteria so the distribution respects bucket/owner/
// category scope, not just the date range.
export async function getCategoryDistributionService(userId: string, body: unknown) {
  const parsed = categoryDistributionSchema.parse(body ?? {});
  const filterCriteria = parsed.filterCriteria ?? defaultExpenseFilterCriteria();
  const { query } = await buildExpenseQuery(userId, {
    filterCriteria,
    sortCriteria: { field: "paidAt", direction: "DESC" },
    pagination: { page: 1, pageSize: 1 },
  });
  return expenseRepository.getFilteredCategoryDistribution(query);
}

export async function getCategoryStatsSummaryService(
  userId: string,
  body: unknown,
): Promise<CategoryStatsSummary> {
  const parsed = categoryStatsSummarySchema.parse(body ?? {});
  const defaults = defaultCategorySearchRequest().filterCriteria;
  const filterCriteria = { ...defaults, ...parsed.filterCriteria };
  const { query } = await buildCategoryQuery(userId, {
    filterCriteria,
    sortCriteria: { field: "createdAt", direction: "DESC" },
    pagination: { page: 1, pageSize: 100 },
  });

  const bounds = resolveDateRange(filterCriteria.date);
  const from = bounds?.from ? new Date(bounds.from) : new Date(0);
  const to = bounds?.to ? new Date(bounds.to) : new Date();

  const categoryIds = await listCategoryIds(query);
  if (categoryIds.length === 0) {
    return {
      total: 0,
      min: 0,
      max: 0,
      avg: 0,
      categoryCount: 0,
      expenseCount: 0,
    };
  }

  const stats = await expenseRepository.getExpenseStatsForCategories(
    categoryIds,
    from,
    to,
    query.bucketId as Record<string, unknown> | undefined,
  );
  return { ...stats, categoryCount: categoryIds.length };
}

function defaultExpenseFilterCriteria(): ExpenseFilterCriteria {
  return {
    bucket: { preset: "PERSONAL" },
    category: { preset: "ALL" },
    owner: { preset: "ME" },
    date: { preset: "THIS_MONTH" },
  };
}

function defaultCategorySearchRequest(): CategorySearchRequest {
  return {
    filterCriteria: {
      bucket: { preset: "PERSONAL" },
      owner: { preset: "ME" },
    },
    sortCriteria: { field: "amount", direction: "DESC" },
    pagination: { page: 1, pageSize: 20 },
  };
}

export async function searchCategoriesService(userId: string, searchRequest: unknown) {
  const parsed = categorySearchSchema.parse(searchRequest ?? {});
  const defaults = defaultCategorySearchRequest();
  const request: CategorySearchRequest = {
    filterCriteria: { ...defaults.filterCriteria, ...parsed.filterCriteria },
    sortCriteria: parsed.sortCriteria ?? defaults.sortCriteria,
    pagination: parsed.pagination ?? defaults.pagination,
  };
  return searchCategories(userId, request);
}
