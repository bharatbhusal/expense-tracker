import { Types } from "mongoose";

import { buildCategoryQuery } from "@/lib/query-builders";
import { CategoryModel } from "@/models/Category";
import { ExpenseModel } from "@/models/Expense";
import type {
  CategorySearchRequest,
  SearchResult,
  SortCriteria,
} from "@/constants/types/search.types";
import type { CategoryItem } from "@/constants/types/expense.types";

async function createCategory(data: {
  userId: string;
  name: string;
  color: string;
  emoji?: string;
  bucketId: string;
}) {
  const category = await CategoryModel.create({
    ...data,
    bucketId: new Types.ObjectId(data.bucketId),
  });
  return category.toObject();
}

async function ensureCategoryInBucket(
  userId: string,
  bucketId: string,
  data: { name: string; color: string; emoji?: string },
) {
  const filter = {
    bucketId: new Types.ObjectId(bucketId),
    name: data.name,
  };

  const existing = await CategoryModel.findOne(filter).lean();
  if (existing) {
    return existing;
  }

  try {
    const category = await CategoryModel.create({
      userId,
      bucketId: new Types.ObjectId(bucketId),
      name: data.name,
      color: data.color,
      emoji: data.emoji,
    });
    return category.toObject();
  } catch (error) {
    // ponytail: concurrent create loses the race → re-find the winner
    const refound = await CategoryModel.findOne(filter).lean();
    if (refound) {
      return refound;
    }
    throw error;
  }
}

async function deleteCategoriesByBucket(bucketId: string) {
  return CategoryModel.deleteMany({
    bucketId: new Types.ObjectId(bucketId),
  });
}
async function listCategoriesWithStats(
  categoryQuery: Record<string, unknown>,
  from: Date,
  to: Date,
  filter: SortCriteria,
) {
  const categories = await CategoryModel.find(categoryQuery).lean();

  const match: Record<string, unknown> = {
    categoryId: {
      $in: categories.map((c) => c._id as Types.ObjectId),
    },
    paidAt: {
      $gte: from,
      $lte: to,
    },
  };

  if (categoryQuery.bucketId) {
    match.bucketId = categoryQuery.bucketId;
  }

  const categoryStats = await ExpenseModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$categoryId",
        total: { $sum: "$amount" },
        expenseCount: { $sum: 1 },
        min: { $min: "$amount" },
        max: { $max: "$amount" },
        avg: { $avg: "$amount" },
      },
    },
  ]);

  const statsById = new Map(categoryStats.map((s) => [s._id.toString(), s]));

  // Overall expense statistics
  const total = categoryStats.reduce((acc, s) => acc + s.total, 0);

  const expenseCount = categoryStats.reduce((acc, s) => acc + s.expenseCount, 0);

  const min = categoryStats.length ? Math.min(...categoryStats.map((s) => s.min)) : 0;

  const max = categoryStats.length ? Math.max(...categoryStats.map((s) => s.max)) : 0;

  const avg = expenseCount > 0 ? total / expenseCount : 0;

  const items = categories.map((category) => {
    const categoryStat = statsById.get(category._id.toString());

    const categoryTotal = categoryStat?.total ?? 0;

    return {
      ...category,
      stats: {
        total: categoryTotal,
        count: categoryStat?.expenseCount ?? 0,
        expenseCount: categoryStat?.expenseCount ?? 0,
        min: categoryStat?.min ?? 0,
        max: categoryStat?.max ?? 0,
        avg: categoryStat?.avg ?? 0,
        pct: total > 0 ? Math.round((categoryTotal / total) * 100) : 0,
      },
    };
  });

  // Apply sorting
  const direction = filter.direction === "ASC" ? 1 : -1;

  items.sort((a, b) => {
    let comparison = 0;

    switch (filter.field) {
      case "amount":
      case "total":
        comparison = (a.stats.total ?? 0) - (b.stats.total ?? 0);
        break;

      case "count":
      case "expenseCount":
        comparison = (a.stats.expenseCount ?? 0) - (b.stats.expenseCount ?? 0);
        break;

      case "min":
        comparison = (a.stats.min ?? 0) - (b.stats.min ?? 0);
        break;

      case "max":
        comparison = (a.stats.max ?? 0) - (b.stats.max ?? 0);
        break;

      case "avg":
        comparison = (a.stats.avg ?? 0) - (b.stats.avg ?? 0);
        break;

      case "pct":
        comparison = (a.stats.pct ?? 0) - (b.stats.pct ?? 0);
        break;

      case "name":
        comparison = a.name.localeCompare(b.name);
        break;

      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;

      default:
        comparison = a._id.toString().localeCompare(b._id.toString());
        break;
    }

    return comparison * direction;
  });

  const stats = {
    total,
    count: categories.length,
    expenseCount,
    min,
    max,
    avg,
  };
  return {
    items,
    stats,
  };
}

async function updateCategory(
  categoryId: string,
  bucketId: string,
  data: {
    name: string;
    color: string;
    emoji?: string;
    bucketId?: string;
  },
) {
  if (!Types.ObjectId.isValid(categoryId)) {
    return null;
  }

  return CategoryModel.findOneAndUpdate({ _id: categoryId, bucketId }, data, {
    new: true,
    lean: true,
  });
}

async function getCategoryById(categoryId: string, bucketId?: string | null) {
  if (!Types.ObjectId.isValid(categoryId)) {
    return null;
  }

  return CategoryModel.findOne({
    _id: categoryId,
    ...(bucketId ? { bucketId: new Types.ObjectId(bucketId) } : {}),
  }).lean();
}

async function getCategoryByIdForMember(categoryId: string, validBucketIds: Types.ObjectId[]) {
  if (!Types.ObjectId.isValid(categoryId)) {
    return null;
  }
  return CategoryModel.findOne({
    _id: categoryId,
    bucketId: { $in: validBucketIds },
  }).lean();
}

async function hasCategoryExpenses(categoryId: string, bucketId: string) {
  if (!Types.ObjectId.isValid(categoryId)) {
    return false;
  }
  return !!(await ExpenseModel.exists({ bucketId, categoryId }));
}

async function deleteCategory(categoryId: string, bucketId: string) {
  if (!Types.ObjectId.isValid(categoryId)) {
    return null;
  }
  return CategoryModel.findOneAndDelete({
    _id: categoryId,
    bucketId,
  }).lean();
}

async function listCategoryIds(query: Record<string, unknown>): Promise<Types.ObjectId[]> {
  const docs = await CategoryModel.find(query).select("_id").lean();
  return docs.map((d) => d._id as Types.ObjectId);
}

async function searchCategories(
  userId: string,
  request: CategorySearchRequest,
): Promise<SearchResult<CategoryItem>> {
  const { query, sort, skip, limit } = await buildCategoryQuery(userId, request);

  const [items, total] = await Promise.all([
    CategoryModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
    CategoryModel.countDocuments(query),
  ]);

  return {
    items: items.map((item) => ({
      _id: (item._id as Types.ObjectId).toString(),
      name: item.name,
      color: item.color,
      emoji: item.emoji,
      userId: (item.userId as Types.ObjectId | undefined)?.toString(),
      bucketId: (item.bucketId as Types.ObjectId | undefined)?.toString(),
    })),
    total,
    page: request.pagination.page,
    totalPages: Math.ceil(total / request.pagination.pageSize) || 1,
  };
}

async function categoryExistsInBucket(categoryId: string, bucketId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(categoryId) || !Types.ObjectId.isValid(bucketId)) {
    return false;
  }

  return !!(await CategoryModel.exists({
    _id: categoryId,
    bucketId,
  }));
}

const categoryRepository = {
  createCategory,
  ensureCategoryInBucket,
  deleteCategoriesByBucket,
  listCategoriesWithStats,
  updateCategory,
  getCategoryById,
  getCategoryByIdForMember,
  hasCategoryExpenses,
  deleteCategory,
  listCategoryIds,
  searchCategories,
  categoryExistsInBucket,
};

// ponytail: named re-exports keep expense/bucket/budget/auth services working
// until their workstreams switch to the default object; drop them then.
export {
  createCategory,
  ensureCategoryInBucket,
  deleteCategoriesByBucket,
  listCategoriesWithStats,
  updateCategory,
  getCategoryById,
  getCategoryByIdForMember,
  hasCategoryExpenses,
  deleteCategory,
  listCategoryIds,
  searchCategories,
  categoryExistsInBucket,
};

export default categoryRepository;
