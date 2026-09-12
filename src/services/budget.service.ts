import { Types } from "mongoose";

import { AppError } from "@/lib/errors";
import {
  BUCKET_ERRORS,
  BUDGET_ERRORS,
  CATEGORY_ERRORS,
  ERROR_CODES,
} from "@/constants/error-messages";
import { budgetSchema, budgetUpdateSchema } from "@/lib/validators";
import { getValidBuckets } from "@/lib/query-builders/membership";
import budgetRepository from "@/repositories/budget.repository";
import { findBucketById } from "@/repositories/bucket.repository";
import { ensureCategoryInBucket, getCategoryById } from "@/repositories/category.repository";
import { logAuditEvent } from "@/services/audit.service";
import type { BudgetGroup, BudgetItem, BudgetPeriod } from "@/constants/types/budget.types";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/constants/types/audit.types";

function fallbackBudgetItem(data: {
  _id: string;
  bucketId: string;
  bucketName?: string;
  bucketIcon?: string;
  bucketIsPersonal?: boolean;
  categoryId: string | null;
  categoryName?: string;
  categoryColor?: string;
  categoryEmoji?: string;
  ownerId: string;
  amount: number;
  period: BudgetPeriod;
}): BudgetItem {
  return {
    _id: data._id,
    bucketId: data.bucketId,
    bucketName: data.bucketName,
    bucketIcon: data.bucketIcon,
    bucketIsPersonal: data.bucketIsPersonal,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    categoryColor: data.categoryColor,
    categoryEmoji: data.categoryEmoji,
    ownerId: data.ownerId,
    amount: data.amount,
    period: data.period,
    spent: 0,
    remaining: data.amount,
    pct: 0,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

async function listBudgetsService(userId: string): Promise<BudgetGroup[]> {
  return budgetRepository.buildGroups(userId);
}

async function createBudgetService(userId: string, body: unknown): Promise<BudgetItem> {
  const payload = budgetSchema.parse(body);
  const validBuckets = await getValidBuckets(userId);
  const validSet = new Set(validBuckets.map((id) => id.toString()));
  if (!validSet.has(payload.bucketId)) {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }

  let categoryId: Types.ObjectId | null = null;
  if (payload.categoryId) {
    const cat = await getCategoryById(payload.categoryId, payload.bucketId);
    if (!cat)
      throw new AppError(CATEGORY_ERRORS.NOT_IN_BUCKET, 400, ERROR_CODES.CATEGORY_NOT_IN_BUCKET);
    categoryId = new Types.ObjectId(payload.categoryId);
  }

  const bucket = await findBucketById(payload.bucketId);
  try {
    const created = await budgetRepository.createBudget({
      bucketId: new Types.ObjectId(payload.bucketId),
      categoryId,
      ownerId: new Types.ObjectId(userId),
      amount: payload.amount,
      period: payload.period,
    });

    await logAuditEvent({
      actorId: userId,
      bucketId: payload.bucketId,
      action: AUDIT_ACTIONS.CREATE,
      entity: AUDIT_ENTITIES.BUDGET,
      entityId: created._id.toString(),
      note: `Created ${payload.period} budget of ${payload.amount} for ${categoryId ? "category" : "bucket"} ${bucket?.name ?? payload.bucketId}`,
      metadata: {
        amount: payload.amount,
        period: payload.period,
        categoryId: categoryId?.toString() ?? null,
      },
    });

    // build single item with spent
    const groups = await budgetRepository.buildGroups(userId);
    const found = groups.flatMap((g) => g.budgets).find((b) => b._id === created._id.toString());
    if (found) return found;
    return fallbackBudgetItem({
      _id: created._id.toString(),
      bucketId: payload.bucketId,
      bucketName: bucket?.name,
      bucketIcon: bucket?.icon,
      bucketIsPersonal: bucket?.isPersonal,
      categoryId: categoryId?.toString() ?? null,
      ownerId: userId,
      amount: payload.amount,
      period: payload.period as BudgetPeriod,
    });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      throw new AppError(BUDGET_ERRORS.ALREADY_EXISTS, 409, ERROR_CODES.ALREADY_EXISTS);
    }
    throw e;
  }
}

async function updateBudgetService(
  userId: string,
  budgetId: string,
  body: unknown,
): Promise<BudgetItem> {
  const payload = budgetUpdateSchema.parse(body);
  const current = await budgetRepository.findBudgetById(budgetId);
  if (!current) throw new AppError(BUDGET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  if (current.ownerId.toString() !== userId) {
    throw new AppError(BUDGET_ERRORS.NOT_OWNER_EDIT, 403, ERROR_CODES.NOT_OWNER);
  }

  const targetBucketId = payload.bucketId ?? current.bucketId.toString();
  const validBuckets = await getValidBuckets(userId);
  if (!validBuckets.map((id) => id.toString()).includes(targetBucketId)) {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }

  let nextCategoryId: Types.ObjectId | null | undefined;
  const nextAmount = payload.amount ?? (current.amount as number);
  const nextPeriod = payload.period ?? (current.period as string);

  // handle category resolution like expense move
  if (payload.categoryId !== undefined) {
    if (payload.categoryId === null) {
      nextCategoryId = null;
    } else {
      const cat = await getCategoryById(payload.categoryId, targetBucketId);
      if (!cat)
        throw new AppError(CATEGORY_ERRORS.NOT_IN_BUCKET, 400, ERROR_CODES.CATEGORY_NOT_IN_BUCKET);
      nextCategoryId = new Types.ObjectId(payload.categoryId);
    }
  } else if (payload.bucketId && payload.bucketId !== current.bucketId.toString()) {
    // bucket changed but category not specified -> carry over or ensure
    if (current.categoryId) {
      const sourceCat = await getCategoryById(
        current.categoryId.toString(),
        current.bucketId.toString(),
      );
      if (sourceCat) {
        const destCat = await ensureCategoryInBucket(userId, targetBucketId, {
          name: sourceCat.name,
          color: sourceCat.color,
          emoji: sourceCat.emoji,
        });
        nextCategoryId = destCat._id as Types.ObjectId;
      } else {
        nextCategoryId = null;
      }
    } else {
      nextCategoryId = null;
    }
  }

  const update: Record<string, unknown> = {};
  if (payload.bucketId) update.bucketId = new Types.ObjectId(targetBucketId);
  if (nextCategoryId !== undefined) update.categoryId = nextCategoryId;
  if (payload.amount !== undefined) update.amount = nextAmount;
  if (payload.period !== undefined) update.period = nextPeriod;

  if (Object.keys(update).length === 0) {
    // no change, return current as BudgetItem
    const groups = await budgetRepository.buildGroups(userId);
    const found = groups.flatMap((g) => g.budgets).find((b) => b._id === budgetId);
    if (found) return found;
    throw new AppError(BUDGET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  try {
    const updated = await budgetRepository.updateBudget(budgetId, update);
    if (!updated) throw new AppError(BUDGET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);

    const isMove = payload.bucketId && payload.bucketId !== current.bucketId.toString();
    if (isMove) {
      const sourceName =
        (await findBucketById(current.bucketId.toString()))?.name ?? current.bucketId.toString();
      const destName = (await findBucketById(targetBucketId))?.name ?? targetBucketId;
      await logAuditEvent({
        actorId: userId,
        bucketId: current.bucketId.toString(),
        action: AUDIT_ACTIONS.OUT,
        entity: AUDIT_ENTITIES.BUDGET,
        entityId: budgetId,
        note: `Moved a budget to ${destName}`,
      });
      await logAuditEvent({
        actorId: userId,
        bucketId: targetBucketId,
        action: AUDIT_ACTIONS.IN,
        entity: AUDIT_ENTITIES.BUDGET,
        entityId: budgetId,
        note: `A budget moved from ${sourceName}`,
        metadata: { amount: nextAmount, period: nextPeriod },
      });
    } else {
      await logAuditEvent({
        actorId: userId,
        bucketId: targetBucketId,
        action: AUDIT_ACTIONS.UPDATE,
        entity: AUDIT_ENTITIES.BUDGET,
        entityId: budgetId,
        metadata: {
          amount: nextAmount,
          period: nextPeriod,
          categoryId:
            nextCategoryId !== undefined ? (nextCategoryId?.toString() ?? null) : undefined,
        },
      });
    }

    const groups = await budgetRepository.buildGroups(userId);
    const found = groups.flatMap((g) => g.budgets).find((b) => b._id === budgetId);
    if (found) return found;
    // fallback
    return fallbackBudgetItem({
      _id: budgetId,
      bucketId: targetBucketId,
      categoryId:
        nextCategoryId !== undefined
          ? (nextCategoryId?.toString() ?? null)
          : (current.categoryId?.toString() ?? null),
      ownerId: userId,
      amount: nextAmount,
      period: nextPeriod as BudgetPeriod,
    });
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) {
      throw new AppError(BUDGET_ERRORS.ALREADY_EXISTS, 409, ERROR_CODES.ALREADY_EXISTS);
    }
    throw e;
  }
}

async function deleteBudgetService(userId: string, budgetId: string) {
  const current = await budgetRepository.findBudgetById(budgetId);
  if (!current) throw new AppError(BUDGET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  if (current.ownerId.toString() !== userId) {
    throw new AppError(BUDGET_ERRORS.NOT_OWNER_DELETE, 403, ERROR_CODES.NOT_OWNER);
  }
  await budgetRepository.deleteBudget(budgetId);

  await logAuditEvent({
    actorId: userId,
    bucketId: current.bucketId.toString(),
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.BUDGET,
    entityId: budgetId,
    note: `Deleted budget ${budgetId}`,
  });

  return { message: "Budget deleted" };
}

const budgetService = {
  listBudgetsService,
  createBudgetService,
  updateBudgetService,
  deleteBudgetService,
};

export default budgetService;
