import { Types } from "mongoose";

import { boundsForBudgetPeriod } from "@/lib/date-range";
import { getValidBuckets } from "@/lib/query-builders/membership";
import { BucketModel } from "@/models/Bucket";
import { BudgetModel } from "@/models/Budget";
import { CategoryModel } from "@/models/Category";
import { ExpenseModel } from "@/models/Expense";
import type { BudgetGroup, BudgetItem, BudgetPeriod } from "@/constants/types/budget.types";

type BudgetLean = {
  _id: Types.ObjectId;
  bucketId: Types.ObjectId;
  categoryId: Types.ObjectId | null;
  ownerId: Types.ObjectId;
  amount: number;
  period: string;
  createdAt?: Date;
  updatedAt?: Date;
};

async function createBudget(data: {
  bucketId: Types.ObjectId;
  categoryId: Types.ObjectId | null;
  ownerId: Types.ObjectId;
  amount: number;
  period: string;
}) {
  const budget = await BudgetModel.create(data);
  return budget.toObject();
}

async function findBudgetById(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return BudgetModel.findById(id).lean();
}

async function listBudgetsForBuckets(bucketIds: Types.ObjectId[]) {
  return BudgetModel.find({ bucketId: { $in: bucketIds } }).lean();
}

async function updateBudget(id: string, data: Record<string, unknown>) {
  if (!Types.ObjectId.isValid(id)) return null;
  return BudgetModel.findByIdAndUpdate(id, data, { new: true, lean: true });
}

async function deleteBudget(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return BudgetModel.findByIdAndDelete(id).lean();
}

function toBudgetItem(
  b: Record<string, unknown>,
  bucketMap: Map<string, { name: string; icon?: string; isPersonal?: boolean }>,
  categoryMap: Map<string, { name: string; color: string; emoji?: string }>,
  spentMap: Map<string, number>,
): BudgetItem {
  const id = (b._id as Types.ObjectId).toString();
  const bucketId = (b.bucketId as Types.ObjectId).toString();
  const categoryId = b.categoryId ? (b.categoryId as Types.ObjectId).toString() : null;
  const bucket = bucketMap.get(bucketId);
  const cat = categoryId ? categoryMap.get(categoryId) : undefined;
  const amount = b.amount as number;
  const spent = spentMap.get(id) ?? 0;
  const pct = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  return {
    _id: id,
    bucketId,
    bucketName: bucket?.name,
    bucketIcon: bucket?.icon,
    bucketIsPersonal: bucket?.isPersonal,
    categoryId,
    categoryName: cat?.name,
    categoryColor: cat?.color,
    categoryEmoji: cat?.emoji,
    ownerId: (b.ownerId as Types.ObjectId).toString(),
    amount,
    period: b.period as BudgetPeriod,
    spent,
    remaining: Math.max(0, amount - spent),
    pct,
    createdAt: (b.createdAt as Date | undefined)?.toISOString(),
    updatedAt: (b.updatedAt as Date | undefined)?.toISOString(),
  };
}

// ponytail: one $group per period (weekly/monthly/yearly share bounds),
// bucket-level budgets read the bucket total, category budgets their slice.
async function getSpentMap(budgets: BudgetLean[]): Promise<Map<string, number>> {
  const spent = new Map<string, number>();
  const byPeriod = new Map<string, BudgetLean[]>();
  for (const b of budgets) {
    const list = byPeriod.get(b.period);
    if (list) list.push(b);
    else byPeriod.set(b.period, [b]);
  }

  await Promise.all(
    [...byPeriod.entries()].map(async ([period, items]) => {
      const { from, to } = boundsForBudgetPeriod(period as BudgetPeriod);
      const bucketIds = [...new Set(items.map((b) => b.bucketId.toString()))].map(
        (id) => new Types.ObjectId(id),
      );
      const rows = await ExpenseModel.aggregate<{
        _id: { bucketId: Types.ObjectId; categoryId: Types.ObjectId };
        total: number;
      }>([
        { $match: { bucketId: { $in: bucketIds }, paidAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { bucketId: "$bucketId", categoryId: "$categoryId" },
            total: { $sum: "$amount" },
          },
        },
      ]);

      const bySlice = new Map<string, number>();
      const byBucket = new Map<string, number>();
      for (const r of rows) {
        const bucketKey = r._id.bucketId.toString();
        bySlice.set(`${bucketKey}|${r._id.categoryId.toString()}`, r.total);
        byBucket.set(bucketKey, (byBucket.get(bucketKey) ?? 0) + r.total);
      }
      for (const b of items) {
        const bucketKey = b.bucketId.toString();
        spent.set(
          b._id.toString(),
          b.categoryId
            ? (bySlice.get(`${bucketKey}|${b.categoryId.toString()}`) ?? 0)
            : (byBucket.get(bucketKey) ?? 0),
        );
      }
    }),
  );

  return spent;
}

async function buildGroups(userId: string): Promise<BudgetGroup[]> {
  const validBuckets = await getValidBuckets(userId);
  if (validBuckets.length === 0) return [];
  const budgets = (await listBudgetsForBuckets(validBuckets)) as unknown as BudgetLean[];
  if (budgets.length === 0) return [];

  const bucketIds = [...new Set(budgets.map((b) => b.bucketId.toString()))];
  const categoryIds = budgets
    .map((b) => b.categoryId)
    .filter((id): id is Types.ObjectId => !!id)
    .map((id) => id.toString());

  const buckets = await BucketModel.find({ _id: { $in: bucketIds } })
    .select("name icon isPersonal")
    .lean();
  const categories = categoryIds.length
    ? await CategoryModel.find({ _id: { $in: categoryIds } })
        .select("name color emoji")
        .lean()
    : [];

  const bucketMap = new Map(
    buckets.map((b) => [
      (b._id as Types.ObjectId).toString(),
      {
        name: b.name as string,
        icon: b.icon as string | undefined,
        isPersonal: b.isPersonal as boolean | undefined,
      },
    ]),
  );
  const categoryMap = new Map(
    (categories as { _id: Types.ObjectId; name: string; color: string; emoji?: string }[]).map(
      (c) => [c._id.toString(), { name: c.name, color: c.color, emoji: c.emoji }],
    ),
  );

  const spentMap = await getSpentMap(budgets);

  const items = budgets.map((b) =>
    toBudgetItem(b as unknown as Record<string, unknown>, bucketMap, categoryMap, spentMap),
  );

  // group by bucket
  const byBucket = new Map<string, BudgetItem[]>();
  for (const it of items) {
    if (!byBucket.has(it.bucketId)) byBucket.set(it.bucketId, []);
    byBucket.get(it.bucketId)!.push(it);
  }

  const groups: BudgetGroup[] = [];
  for (const [bucketId, items] of byBucket) {
    const meta = bucketMap.get(bucketId);
    groups.push({
      bucketId,
      bucketName: meta?.name ?? "Unknown",
      bucketIcon: meta?.icon,
      isPersonal: meta?.isPersonal,
      budgets: items,
    });
  }

  // personal first, then alphabetical
  groups.sort((a, b) => {
    if (a.isPersonal && !b.isPersonal) return -1;
    if (!a.isPersonal && b.isPersonal) return 1;
    return a.bucketName.localeCompare(b.bucketName);
  });

  return groups;
}

const budgetRepository = {
  createBudget,
  findBudgetById,
  listBudgetsForBuckets,
  updateBudget,
  deleteBudget,
  buildGroups,
};

export default budgetRepository;
