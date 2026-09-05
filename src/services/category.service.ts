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
import categoryRepository from "@/repositories/category.repository";
import expenseRepository from "@/repositories/expense.repository";
import { findBucketById } from "@/repositories/bucket.repository";
import { findUserById } from "@/repositories/user.repository";
import { logAuditEvent } from "@/services/audit.service";
import { randomHexColor } from "@/lib/utils";
import type { CategoryStatsSummary } from "@/constants/types/analytics.types";
import type { CategorySearchRequest, ExpenseFilterCriteria } from "@/constants/types/search.types";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/constants/types/audit.types";
import type { AuthUser } from "@/constants/types/auth.types";

async function assertCategoryCreator(
  userId: string,
  categoryId: string,
  validBucketIds: Types.ObjectId[],
) {
  const category = await categoryRepository.getCategoryByIdForMember(categoryId, validBucketIds);
  if (!category) {
    throw new AppError(CATEGORY_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  if (category.userId.toString() !== userId) {
    throw new AppError(CATEGORY_ERRORS.NOT_OWNER, 403, ERROR_CODES.NOT_OWNER);
  }
  return category;
}

async function listCategoriesWithStats(userId: string, body: unknown) {
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

  return categoryRepository.listCategoriesWithStats(categoryQuery, from, to, sortCriteria);
}

async function createCategory(auth: AuthUser, body: unknown) {
  const userId = auth.id;
  const payload = categorySchema.parse(body);

  const validBuckets = await getValidBuckets(userId);
  if (!validBuckets.map((id) => id.toString()).includes(payload.bucketId)) {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }

  const existing = await findUserById(userId);
  if (!existing) {
    throw new AppError(USER_ERRORS.DOESNT_EXIST, 409, ERROR_CODES.USER_DOESNT_EXIST);
  }

  const category = await categoryRepository.createCategory({
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
    entity: AUDIT_ENTITIES.CATEGORY,
    entityId: category._id.toString(),
    note: `Created category "${category.name}"`,
  });

  return category;
}

async function getCategory(userId: string, categoryId: string) {
  const validBuckets = await getValidBuckets(userId);
  const category = await categoryRepository.getCategoryByIdForMember(categoryId, validBuckets);
  if (!category) {
    throw new AppError(CATEGORY_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  return category;
}

async function updateCategory(userId: string, categoryId: string, body: unknown) {
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

  const category = await categoryRepository.updateCategory(categoryId, currentBucketId, {
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
      entity: AUDIT_ENTITIES.CATEGORY,
      entityId: category._id.toString(),
      note: `Moved category "${category.name}" to ${destName}`,
    });
    await logAuditEvent({
      actorId: userId,
      bucketId: destId,
      action: AUDIT_ACTIONS.IN,
      entity: AUDIT_ENTITIES.CATEGORY,
      entityId: category._id.toString(),
      note: `Category "${category.name}" moved from ${sourceName}`,
    });
  } else {
    await logAuditEvent({
      actorId: userId,
      bucketId: currentBucketId,
      action: AUDIT_ACTIONS.UPDATE,
      entity: AUDIT_ENTITIES.CATEGORY,
      entityId: category._id.toString(),
      note: `Updated category "${category.name}"`,
    });
  }

  return category;
}

async function deleteCategory(userId: string, categoryId: string) {
  const validBuckets = await getValidBuckets(userId);
  const category = await assertCategoryCreator(userId, categoryId, validBuckets);

  if (await categoryRepository.hasCategoryExpenses(categoryId, category.bucketId.toString())) {
    throw new AppError(CATEGORY_ERRORS.HAS_EXPENSES, 400, ERROR_CODES.HAS_EXPENSES);
  }

  const deleted = await categoryRepository.deleteCategory(categoryId, category.bucketId.toString());
  if (!deleted) {
    throw new AppError(CATEGORY_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId: category.bucketId.toString(),
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.CATEGORY,
    entityId: categoryId,
    note: `Deleted category "${category.name}"`,
  });

  return { message: "Category deleted" };
}

async function getCategoryStats(userId: string, categoryId: string, from: string, to: string) {
  if (!from || !to) {
    throw new AppError(CATEGORY_ERRORS.FROM_TO_REQUIRED, 400);
  }
  const category = await getCategory(userId, categoryId);
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
async function getCategoryDistribution(userId: string, body: unknown) {
  const parsed = categoryDistributionSchema.parse(body ?? {});
  const filterCriteria = parsed.filterCriteria ?? defaultExpenseFilterCriteria();
  const { query } = await buildExpenseQuery(userId, {
    filterCriteria,
    sortCriteria: { field: "paidAt", direction: "DESC" },
    pagination: { page: 1, pageSize: 1 },
  });
  return expenseRepository.getFilteredCategoryDistribution(query);
}

async function getCategoryStatsSummary(
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

  const categoryIds = await categoryRepository.listCategoryIds(query);
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

async function searchCategories(userId: string, searchRequest: unknown) {
  const parsed = categorySearchSchema.parse(searchRequest ?? {});
  const defaults = defaultCategorySearchRequest();
  const request: CategorySearchRequest = {
    filterCriteria: { ...defaults.filterCriteria, ...parsed.filterCriteria },
    sortCriteria: parsed.sortCriteria ?? defaults.sortCriteria,
    pagination: parsed.pagination ?? defaults.pagination,
  };
  return categoryRepository.searchCategories(userId, request);
}

const categoryService = {
  searchCategories,
  listCategoriesWithStats,
  createCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoryStats,
  getCategoryDistribution,
  getCategoryStatsSummary,
};

export default categoryService;
