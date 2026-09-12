import { Types } from "mongoose";

import { buildExpenseQuery } from "@/lib/query-builders";
import { ExpenseModel } from "@/models/Expense";
import { CategoryModel } from "@/models/Category";
import { BucketModel } from "@/models/Bucket";
import { UserModel } from "@/models/User";
import type {
  DistributionDimension,
  ExpenseSearchRequest,
  SearchResult,
} from "@/constants/types/search.types";
import type { ExpenseItem } from "@/constants/types/expense.types";
import type {
  ExpenseContribution,
  CategoryBreakdownPoint,
  DistributionPoint,
  TrendPoint,
} from "@/constants/types/analytics.types";

type AggregateBucket = {
  _id: string | null;
  total: number;
};

type SummaryBucket = {
  _id: null;
  total: number;
  count: number;
  avg: number;
  min: number;
  max: number;
};

type DailyTrendBucket = {
  _id: string;
  total: number;
};

type WeekdayBucket = {
  _id: number;
  total: number;
};

type CategoryBucket = {
  _id: Types.ObjectId | string | null;
  total: number;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

async function createExpense(data: {
  userId: string;
  bucketId: string;
  title: string;
  amount: number;
  categoryId: string;
  notes?: string;
  images: string[];
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  currency: string;
  paidAt?: Date;
}) {
  const expense = await ExpenseModel.create(data);
  return expense.toObject();
}

async function updateExpense(userId: string, expenseId: string, data: Record<string, unknown>) {
  if (!Types.ObjectId.isValid(expenseId)) {
    return null;
  }

  return ExpenseModel.findOneAndUpdate({ _id: expenseId, userId }, data, { new: true, lean: true });
}

async function deleteExpense(userId: string, expenseId: string) {
  if (!Types.ObjectId.isValid(expenseId)) {
    return null;
  }

  return ExpenseModel.findOneAndDelete({
    _id: expenseId,
    userId,
  }).lean();
}
async function getExpenseById(expenseId: string) {
  if (!Types.ObjectId.isValid(expenseId)) {
    return null;
  }

  const expense = await ExpenseModel.findOne({
    _id: expenseId,
  })
    .populate("categoryId", "emoji color")
    .lean();

  if (!expense) return null;

  const category = expense.categoryId as {
    _id: Types.ObjectId;
    emoji: string;
    color: string;
  };

  return {
    ...expense,
    categoryId: category._id.toString(),
    categoryEmoji: category.emoji,
    categoryColor: category.color,
  };
}

async function getExpenseByIdForMember(expenseId: string, validBucketIds: Types.ObjectId[]) {
  if (!Types.ObjectId.isValid(expenseId)) {
    return null;
  }
  const expense = await ExpenseModel.findOne({
    _id: expenseId,
    bucketId: { $in: validBucketIds },
  })
    .populate("categoryId", "emoji color")
    .lean();
  if (!expense) return null;
  const category = expense.categoryId as {
    _id: Types.ObjectId;
    emoji: string;
    color: string;
  };
  return {
    ...expense,
    categoryId: category._id.toString(),
    categoryEmoji: category.emoji,
    categoryColor: category.color,
  };
}
async function listRecentExpenses(userId: string, limit = 5) {
  return ExpenseModel.find({ userId }).sort({ paidAt: -1 }).limit(limit).lean();
}

async function listExpensesForRange(
  from: Date,
  to: Date,
  validBucketIds: Types.ObjectId[],
  categoryId?: string,
) {
  const filter: Record<string, unknown> = {
    bucketId: { $in: validBucketIds },
    paidAt: { $gte: from, $lte: to },
  };
  if (categoryId) {
    filter.categoryId = categoryId;
  }
  return ExpenseModel.find(filter).sort({ paidAt: 1 }).lean();
}

async function aggregateRangeStats(userId: string, from: Date, to: Date) {
  const match: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),

    paidAt: { $gte: from, $lte: to },
  };

  const [totalResult, categoryBreakdown, dailyTrend, weeklyDocs] = (await Promise.all([
    ExpenseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          avg: { $avg: "$amount" },
          min: { $min: "$amount" },
          max: { $max: "$amount" },
        },
      },
    ]),
    ExpenseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" },
        },
      },
    ]),
    ExpenseModel.aggregate([
      { $match: match },
      {
        $project: {
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$paidAt",
            },
          },
          amount: "$amount",
        },
      },
      { $group: { _id: "$day", total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
    ExpenseModel.aggregate([
      { $match: match },
      {
        $project: {
          weekday: {
            $dayOfWeek: "$paidAt",
          },
          amount: "$amount",
        },
      },
      {
        $group: { _id: "$weekday", total: { $sum: "$amount" } },
      },
      { $sort: { _id: 1 } },
    ]),
  ])) as [SummaryBucket[], CategoryBucket[], DailyTrendBucket[], WeekdayBucket[]];

  const totals = totalResult[0] || {
    total: 0,
    count: 0,
    avg: 0,
    min: 0,
    max: 0,
  };

  const dailyTrendMap: TrendPoint[] = dailyTrend.map((d) => ({
    name: d._id,
    total: d.total,
  }));
  const weeklyTrendMap: TrendPoint[] = weeklyDocs.map((d) => ({
    name: WEEKDAY_LABELS[Math.max(0, d._id - 1)] ?? String(d._id),
    total: d.total,
  }));

  const categoryBreakdownFormatted = categoryBreakdown.map((c) => ({
    categoryId: c._id?.toString?.() ?? "",
    value: c.total,
  }));

  return {
    total: totals.total,
    count: totals.count,
    avg: totals.avg,
    min: totals.min,
    max: totals.max,
    categoryBreakdown: categoryBreakdownFormatted,
    dailyTrend: dailyTrendMap,
    weeklyTrend: weeklyTrendMap,
  };
}

async function getCategoryRangeStats(
  userId: string,
  categoryId: string,
  from: Date,
  to: Date,
  bucketId: string,
) {
  const match: Record<string, unknown> = {
    bucketId: new Types.ObjectId(bucketId),
    paidAt: { $gte: from, $lte: to },
  };

  const categoryMatch: Record<string, unknown> = {
    ...match,
    categoryId: new Types.ObjectId(categoryId),
  };

  const dateFormat = "%Y-%m-%d";

  const [categoryResult, totalResult, trend] = await Promise.all([
    ExpenseModel.aggregate<SummaryBucket>([
      { $match: categoryMatch },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          avg: { $avg: "$amount" },
          min: { $min: "$amount" },
          max: { $max: "$amount" },
        },
      },
    ]),
    ExpenseModel.aggregate<SummaryBucket>([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]),
    ExpenseModel.aggregate([
      { $match: categoryMatch },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: "$paidAt",
            },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          name: "$_id",
          total: 1,
        },
      },
    ]),
  ]);

  const category = categoryResult[0] ?? {
    total: 0,
    count: 0,
    avg: 0,
    min: 0,
    max: 0,
  };
  const total = totalResult[0]?.total ?? 0;

  return {
    total: category.total,
    count: category.count,
    avg: category.avg,
    min: category.min,
    max: category.max,
    pct: total > 0 ? (category.total / total) * 100 : 0,
    trend,
  };
}

async function getExpenseContribution(
  expenseId: string,
  bucketId: Types.ObjectId,
  from?: Date,
  to?: Date,
) {
  if (!Types.ObjectId.isValid(expenseId)) return null;
  const expense = await ExpenseModel.findOne({
    _id: new Types.ObjectId(expenseId),
    bucketId,
  }).lean();
  if (!expense) return null;

  const scopeFilter: Record<string, unknown> = {
    bucketId,
  };

  const amount = expense.amount;
  const date = new Date(expense.paidAt);

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const trendStart = new Date(date);
  trendStart.setFullYear(date.getFullYear() - 1);
  trendStart.setDate(1);
  trendStart.setHours(0, 0, 0, 0);

  const categoryMatch: Record<string, unknown> = {
    ...scopeFilter,
    categoryId: expense.categoryId,
  };
  if (from || to) {
    const paidAt: Record<string, Date> = {};
    if (from) paidAt.$gte = from;
    if (to) paidAt.$lte = to;
    categoryMatch.paidAt = paidAt;
  }

  const [
    weekTotal,
    monthTotal,
    yearTotal,
    categoryTotalResult,
    monthlyTrendResult,
    categoryCountResult,
  ] = (await Promise.all([
    ExpenseModel.aggregate([
      {
        $match: {
          ...scopeFilter,
          paidAt: { $gte: weekStart, $lte: date },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ExpenseModel.aggregate([
      {
        $match: {
          ...scopeFilter,
          paidAt: { $gte: monthStart, $lte: date },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ExpenseModel.aggregate([
      {
        $match: {
          ...scopeFilter,
          paidAt: { $gte: yearStart, $lte: date },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ExpenseModel.aggregate([
      { $match: categoryMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    ExpenseModel.aggregate([
      {
        $match: {
          ...scopeFilter,
          categoryId: expense.categoryId,
          paidAt: { $gte: trendStart, $lte: date },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$paidAt",
            },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    ExpenseModel.countDocuments([categoryMatch]),
  ])) as [
    AggregateBucket[],
    AggregateBucket[],
    AggregateBucket[],
    AggregateBucket[],
    AggregateBucket[],
    number,
  ];

  const week = weekTotal[0]?.total ?? 0;
  const month = monthTotal[0]?.total ?? 0;
  const year = yearTotal[0]?.total ?? 0;
  const cat = categoryTotalResult[0]?.total ?? 0;
  const categoryExpenseCount = categoryCountResult;
  const monthlyTrend: TrendPoint[] = monthlyTrendResult.map((d) => ({
    name: d._id ?? "",
    total: d.total,
  }));

  return {
    expenseId,
    amount,
    weekTotal: week,
    monthTotal: month,
    yearTotal: year,
    categoryTotal: cat,
    categoryExpenseCount,
    categoryAverage: categoryExpenseCount > 0 ? cat / categoryExpenseCount : 0,
    weekContributionPercent: week > 0 ? (amount / week) * 100 : 0,
    monthContributionPercent: month > 0 ? (amount / month) * 100 : 0,
    yearContributionPercent: year > 0 ? (amount / year) * 100 : 0,
    categoryContributionPercent: cat > 0 ? (amount / cat) * 100 : 0,
    monthlyTrend,
  } satisfies ExpenseContribution;
}

const DISTRIBUTION_FIELD: Record<DistributionDimension, string> = {
  category: "$categoryId",
  owner: "$userId",
  bucket: "$bucketId",
};

async function getDistribution(
  bucketIds: Types.ObjectId[],
  dimension: DistributionDimension,
  from?: Date,
  to?: Date,
  // ponytail: full expense filter match (bucket/category/owner/date/search/…)
  // so distribution and search interpret filters identically.
  filterMatch?: Record<string, unknown>,
): Promise<DistributionPoint[]> {
  const match: Record<string, unknown> = filterMatch ?? {
    bucketId: { $in: bucketIds },
  };
  if (!filterMatch && (from || to)) {
    match.paidAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const totals = await ExpenseModel.aggregate<{
    _id: Types.ObjectId | null;
    value: number;
  }>([
    { $match: match },
    {
      $group: {
        _id: DISTRIBUTION_FIELD[dimension],
        value: { $sum: "$amount" },
      },
    },
  ]);

  const ids = totals.map((t) => t._id).filter((id): id is Types.ObjectId => id !== null);

  const docs =
    dimension === "category"
      ? await CategoryModel.find({ _id: { $in: ids } })
          .select("name color")
          .lean()
      : dimension === "owner"
        ? await UserModel.find({ _id: { $in: ids } })
            .select("name username")
            .lean()
        : await BucketModel.find({ _id: { $in: ids } })
            .select("name icon")
            .lean();

  const byId = new Map(docs.map((d) => [(d._id as Types.ObjectId).toString(), d]));

  return totals
    .map((t) => {
      const id = t._id?.toString() ?? "";
      const doc = byId.get(id) as
        | {
            name?: string;
            username?: string;
            color?: string;
            icon?: string;
          }
        | undefined;
      return {
        id,
        name: doc?.name ?? doc?.username ?? "Unknown",
        value: t.value,
        ...(dimension === "category" ? { color: doc?.color ?? "#6b7280" } : {}),
        ...(dimension === "bucket" ? { icon: doc?.icon ?? "📁" } : {}),
      };
    })
    .sort((a, b) => b.value - a.value);
}

async function getFilteredCategoryDistribution(
  query: Record<string, unknown>,
): Promise<CategoryBreakdownPoint[]> {
  const totals = await ExpenseModel.aggregate<{
    _id: Types.ObjectId | null;
    value: number;
  }>([
    { $match: query },
    {
      $group: {
        _id: "$categoryId",
        value: { $sum: "$amount" },
      },
    },
  ]);

  const ids = totals.map((t) => t._id).filter((id): id is Types.ObjectId => id !== null);
  const categories = await CategoryModel.find({
    _id: { $in: ids },
  })
    .select("name color")
    .lean();
  const byId = new Map(categories.map((c) => [c._id.toString(), c]));

  return totals
    .map((t) => {
      const id = t._id?.toString() ?? "";
      const cat = byId.get(id);
      return {
        categoryId: id,
        name: cat?.name ?? "Uncategorized",
        value: t.value,
        color: cat?.color ?? "#6b7280",
      };
    })
    .sort((a, b) => b.value - a.value);
}

async function getExpenseStatsForCategories(
  categoryIds: Types.ObjectId[],
  from: Date,
  to: Date,
  bucketId?: Record<string, unknown>,
): Promise<{
  total: number;
  min: number;
  max: number;
  avg: number;
  expenseCount: number;
}> {
  const match: Record<string, unknown> = {
    categoryId: { $in: categoryIds },
    paidAt: { $gte: from, $lte: to },
  };
  if (bucketId) match.bucketId = bucketId;

  const [result] = await ExpenseModel.aggregate<SummaryBucket>([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
        avg: { $avg: "$amount" },
        min: { $min: "$amount" },
        max: { $max: "$amount" },
      },
    },
  ]);

  return {
    total: result?.total ?? 0,
    min: result?.min ?? 0,
    max: result?.max ?? 0,
    avg: result?.avg ?? 0,
    expenseCount: result?.count ?? 0,
  };
}

async function getExpenseOverviewStats(match: Record<string, unknown>) {
  const [result] = await ExpenseModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
        avg: { $avg: "$amount" },
        min: { $min: "$amount" },
        max: { $max: "$amount" },
        categories: { $addToSet: "$categoryId" },
      },
    },
  ]);

  return {
    total: result?.total ?? 0,
    count: result?.count ?? 0,
    avg: result?.avg ?? 0,
    min: result?.min ?? 0,
    max: result?.max ?? 0,
    categoriesCount: result?.categories?.length ?? 0,
  };
}

async function getChartData(match: Record<string, unknown>, from: Date, to: Date) {
  const dayDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

  let dateGroup: Record<string, unknown>;
  if (dayDiff <= 1) {
    dateGroup = { $hour: "$paidAt" };
  } else if (dayDiff > 60) {
    dateGroup = {
      $dateToString: { format: "%Y-%m", date: "$paidAt" },
    };
  } else {
    dateGroup = {
      $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
    };
  }

  const [periodData, categories] = await Promise.all([
    ExpenseModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            period: dateGroup,
            categoryId: "$categoryId",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.period": 1 } },
    ]),
    CategoryModel.find({ bucketId: match.bucketId }).lean(),
  ]);

  const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));

  const periodMap = new Map<string, Record<string, number>>();
  const periodOrder: string[] = [];

  for (const row of periodData) {
    const periodKey = formatPeriodLabel(row._id.period, dayDiff);
    const catName = nameById.get(row._id.categoryId.toString()) ?? "Uncategorized";

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {});
      periodOrder.push(periodKey);
    }
    const entry = periodMap.get(periodKey)!;
    entry[catName] = (entry[catName] ?? 0) + row.total;
  }

  const series = periodOrder.map((key) => {
    const categories = periodMap.get(key) ?? {};
    return { name: key, ...categories };
  });

  const categoryColors: Record<string, string> = {};
  for (const cat of categories) {
    categoryColors[cat.name] = cat.color;
  }

  return {
    series,
    categoryColors,
  };
}

function formatPeriodLabel(id: string | number, dayDiff: number): string {
  if (dayDiff <= 1) {
    const hour = Number(id);
    return `${String(hour).padStart(2, "0")}:00`;
  }
  if (typeof id === "string" && id.length === 7) {
    const [y, m] = id.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      year: "2-digit",
    }).format(date);
  }
  if (typeof id === "string" && id.length === 10) {
    const date = new Date(id + "T00:00:00");
    return new Intl.DateTimeFormat("en-IN", {
      month: "short",
      day: "2-digit",
    }).format(date);
  }
  return String(id);
}

async function searchExpenses(
  userId: string,
  request: ExpenseSearchRequest,
): Promise<SearchResult<ExpenseItem>> {
  const { query, sort, skip, limit } = await buildExpenseQuery(userId, request);

  const [items, total] = await Promise.all([
    ExpenseModel.find(query)
      .populate("userId", "name username")
      .populate("categoryId", "emoji color")
      .select(
        "title amount paidAt currency notes images location bucketId userId createdAt updatedAt",
      )
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ExpenseModel.countDocuments(query),
  ]);

  const transformedItems = items.map((item) => {
    const posterName = (item.userId as { username?: string } | undefined)?.username ?? "";
    return {
      _id: (item._id as Types.ObjectId).toString(),
      title: item.title,
      amount: item.amount,
      currency: item.currency,
      paidAt: item.paidAt.toISOString(),
      categoryId: (item.categoryId as { _id?: Types.ObjectId } | undefined)?._id?.toString() ?? "",
      categoryColor: (item.categoryId as { color?: string } | undefined)?.color ?? "",
      categoryEmoji: (item.categoryId as { emoji?: string } | undefined)?.emoji ?? "",
      notes: item.notes,
      images: item.images ?? [],
      location: item.location,
      bucketId: (item.bucketId as Types.ObjectId).toString(),
      userId: (item.userId as { _id?: Types.ObjectId } | undefined)?._id?.toString() ?? "",
      ...(posterName ? { posterName } : {}),
      createdAt: item.createdAt?.toISOString(),
      updatedAt: item.updatedAt?.toISOString(),
    } satisfies ExpenseItem;
  });

  return {
    items: transformedItems,
    total,
    page: request.pagination.page,
    totalPages: Math.ceil(total / request.pagination.pageSize) || 1,
  };
}

const expenseRepository = {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseById,
  getExpenseByIdForMember,
  listRecentExpenses,
  listExpensesForRange,
  aggregateRangeStats,
  getCategoryRangeStats,
  getExpenseContribution,
  getDistribution,
  getFilteredCategoryDistribution,
  getExpenseStatsForCategories,
  getExpenseOverviewStats,
  getChartData,
  searchExpenses,
};

export default expenseRepository;
