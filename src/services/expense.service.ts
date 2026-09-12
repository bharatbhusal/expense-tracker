import { AppError } from "@/lib/errors";
import {
  BUCKET_ERRORS,
  CATEGORY_ERRORS,
  ERROR_CODES,
  EXPENSE_ERRORS,
  USER_ERRORS,
} from "@/constants/error-messages";
import { chartOverviewSchema, expenseSchema, expenseSearchSchema } from "@/lib/validators";
import { resolveDateRange } from "@/lib/date-range";
import { buildExpenseQuery } from "@/lib/query-builders";
import { getValidBuckets } from "@/lib/query-builders/membership";
import expenseRepository from "@/repositories/expense.repository";
import {
  categoryExistsInBucket,
  ensureCategoryInBucket,
  getCategoryById,
} from "@/repositories/category.repository";
import { findBucketById, isMember } from "@/repositories/bucket.repository";
import { logAuditEvent } from "@/services/audit.service";
import type { ExpenseSearchRequest } from "@/constants/types/search.types";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/constants/types/audit.types";
import { AuthUser } from "@/constants/types/auth.types";
async function createExpense(authUser: AuthUser, body: unknown) {
  const payload = expenseSchema.parse(body);

  const [validBucket, categoryExists] = await Promise.all([
    isMember(authUser.id, payload.bucketId),
    categoryExistsInBucket(payload.categoryId, payload.bucketId),
  ]);

  if (!validBucket) {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }

  if (!categoryExists) {
    throw new AppError(CATEGORY_ERRORS.NOT_IN_BUCKET, 400, ERROR_CODES.CATEGORY_NOT_IN_BUCKET);
  }

  const expense = await expenseRepository.createExpense({
    userId: authUser.id,
    bucketId: payload.bucketId,
    title: payload.title,
    amount: payload.amount,
    categoryId: payload.categoryId,
    notes: payload.notes,
    images: payload.images,
    location: payload.location,
    currency: payload.currency,
    paidAt: payload.paidAt ? new Date(payload.paidAt) : undefined,
  });

  await logAuditEvent({
    actorId: authUser.id,
    bucketId: payload.bucketId,
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.EXPENSE,
    entityId: expense._id.toString(),
    note: `Created expense "${expense.title}"`,
    metadata: { amount: expense.amount },
  });

  return expense;
}

async function getExpense(userId: string, expenseId: string) {
  const validBuckets = await getValidBuckets(userId);
  const expense = await expenseRepository.getExpenseByIdForMember(expenseId, validBuckets);
  if (!expense) {
    throw new AppError(EXPENSE_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  return expense;
}

async function updateExpense(userId: string, expenseId: string, body: unknown) {
  const payload = expenseSchema.partial().parse(body);

  const validBuckets = await getValidBuckets(userId);
  const current = await expenseRepository.getExpenseByIdForMember(expenseId, validBuckets);
  if (!current) {
    throw new AppError(EXPENSE_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  if (current.userId.toString() !== userId) {
    throw new AppError(EXPENSE_ERRORS.NOT_OWNER_UPDATE, 403, ERROR_CODES.NOT_OWNER);
  }

  const targetBucketId = payload.bucketId ? String(payload.bucketId) : current.bucketId.toString();

  if (payload.bucketId && !validBuckets.map((id) => id.toString()).includes(targetBucketId)) {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }

  let categoryId: string;
  if (payload.categoryId) {
    const category = await getCategoryById(payload.categoryId, targetBucketId);
    if (!category) {
      throw new AppError(CATEGORY_ERRORS.NOT_IN_BUCKET, 400, ERROR_CODES.CATEGORY_NOT_IN_BUCKET);
    }
    categoryId = category._id.toString();
  } else if (targetBucketId === current.bucketId.toString()) {
    categoryId = current.categoryId;
  } else {
    const sourceCategory = await getCategoryById(current.categoryId, current.bucketId.toString());
    if (!sourceCategory) {
      throw new AppError(
        EXPENSE_ERRORS.SOURCE_CATEGORY_NOT_FOUND,
        400,
        ERROR_CODES.CATEGORY_NOT_IN_BUCKET,
      );
    }
    const destCategory = await ensureCategoryInBucket(userId, targetBucketId, {
      name: sourceCategory.name,
      color: sourceCategory.color,
      emoji: sourceCategory.emoji,
    });
    categoryId = destCategory._id.toString();
  }

  const expense = await expenseRepository.updateExpense(userId, expenseId, {
    ...payload,
    categoryId,
    bucketId: targetBucketId,
  });
  if (!expense) {
    throw new AppError(EXPENSE_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  if (payload.bucketId && payload.bucketId !== current.bucketId.toString()) {
    const sourceId = current.bucketId.toString();
    const destId = targetBucketId;
    const sourceName = (await findBucketById(sourceId))?.name ?? sourceId;
    const destName = (await findBucketById(destId))?.name ?? destId;
    await logAuditEvent({
      actorId: userId,
      bucketId: sourceId,
      action: AUDIT_ACTIONS.OUT,
      entity: "expense",
      entityId: expenseId,
      note: `Moved expense "${expense.title}" to ${destName}`,
    });
    await logAuditEvent({
      actorId: userId,
      bucketId: destId,
      action: AUDIT_ACTIONS.IN,
      entity: "expense",
      entityId: expenseId,
      note: `Expense "${expense.title}" moved from ${sourceName}`,
    });
  } else {
    await logAuditEvent({
      actorId: userId,
      bucketId: current.bucketId.toString(),
      action: AUDIT_ACTIONS.UPDATE,
      entity: "expense",
      entityId: expenseId,
      note: `Updated expense "${expense.title}"`,
    });
  }

  return expense;
}

async function deleteExpense(userId: string, expenseId: string) {
  const validBuckets = await getValidBuckets(userId);
  const existing = await expenseRepository.getExpenseByIdForMember(expenseId, validBuckets);
  if (!existing) {
    throw new AppError(EXPENSE_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  if (existing.userId.toString() !== userId) {
    throw new AppError(EXPENSE_ERRORS.NOT_OWNER_DELETE, 403, ERROR_CODES.NOT_OWNER);
  }
  const deleted = await expenseRepository.deleteExpense(userId, expenseId);
  if (!deleted) {
    throw new AppError(EXPENSE_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId: existing.bucketId.toString(),
    action: AUDIT_ACTIONS.DELETE,
    entity: "expense",
    entityId: expenseId,
    note: `Deleted expense "${deleted.title}"`,
  });

  return { message: "Expense deleted" };
}

// ponytail: overview/chart share the same parse + query-build step; both
// aggregate on the full filter criteria (bucket/category/owner/date/search/…)
// so the cards and chart always match what the table shows.
async function chartOverviewContext(
  userId: string,
  body: unknown,
): Promise<{
  match: Record<string, unknown>;
  from: Date;
  to: Date;
}> {
  const parsed = chartOverviewSchema.parse(body ?? {});
  const filters = parsed.filterCriteria ?? defaultExpenseSearchRequest().filterCriteria;

  const { query } = await buildExpenseQuery(userId, {
    filterCriteria: filters,
    sortCriteria: { field: "paidAt", direction: "DESC" },
    pagination: { page: 1, pageSize: 1 },
  });

  const bounds = resolveDateRange(filters.date);
  return {
    match: query,
    from: bounds?.from ? new Date(bounds.from) : new Date(0),
    to: bounds?.to ? new Date(bounds.to) : new Date(),
  };
}

async function getExpenseOverviewStats(userId: string, body: unknown) {
  const { match, from, to } = await chartOverviewContext(userId, body);
  const { total, count, avg, min, max, categoriesCount } =
    await expenseRepository.getExpenseOverviewStats(match);

  const dayDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

  let periodCount: number;
  let perPeriodLabel: string;
  if (dayDiff <= 60) {
    periodCount = Math.max(1, dayDiff);
    perPeriodLabel = "spend_per_day";
  } else {
    periodCount =
      to.getMonth() - from.getMonth() + 1 + (to.getFullYear() - from.getFullYear()) * 12;
    perPeriodLabel = "spend_per_month";
  }

  const averageSpend = periodCount > 0 ? total / periodCount : total;

  const cards = [
    {
      key: perPeriodLabel,
      title: perPeriodLabel === "spend_per_month" ? "Per Month Spend" : "Per Day Spend",
      value: averageSpend,
    },
    {
      key: "expense_count",
      title: "Expenses",
      value: count,
    },
    {
      key: "categories_count",
      title: "Categories",
      value: categoriesCount,
    },
    {
      key: "avg_amount",
      title: "Average",
      value: avg,
    },
    {
      key: "min_amount",
      title: "Minimum",
      value: min,
    },
    {
      key: "max_amount",
      title: "Maximum",
      value: max,
    },
    {
      key: "total_spend",
      title: "Total Spend",
      value: total,
    },
  ];

  return cards;
}

async function getChartData(userId: string, body: unknown) {
  const { match, from, to } = await chartOverviewContext(userId, body);
  return expenseRepository.getChartData(match, from, to);
}

function defaultExpenseSearchRequest(): ExpenseSearchRequest {
  return {
    filterCriteria: {
      bucket: { preset: "PERSONAL" },
      category: { preset: "ALL" },
      owner: { preset: "ME" },
      date: { preset: "THIS_MONTH" },
    },
    sortCriteria: { field: "paidAt", direction: "DESC" },
    pagination: { page: 1, pageSize: 20 },
  };
}

async function searchExpenses(userId: string, searchRequest: unknown) {
  const parsed = expenseSearchSchema.parse(searchRequest ?? {});
  const defaults = defaultExpenseSearchRequest();
  const request: ExpenseSearchRequest = {
    filterCriteria: { ...defaults.filterCriteria, ...parsed.filterCriteria },
    sortCriteria: parsed.sortCriteria ?? defaults.sortCriteria,
    pagination: parsed.pagination ?? defaults.pagination,
  };
  return expenseRepository.searchExpenses(userId, request);
}

const expenseService = {
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseOverviewStats,
  getChartData,
  searchExpenses,
};

export default expenseService;
