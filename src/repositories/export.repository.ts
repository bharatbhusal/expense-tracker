import type { Types } from "mongoose";

import { CategoryModel } from "@/models/Category";
import { ExpenseModel } from "@/models/Expense";

async function getExportData(validBuckets: Types.ObjectId[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [categories, expenses, monthlyExpenses] = await Promise.all([
    CategoryModel.find({ bucketId: { $in: validBuckets } })
      .sort({ createdAt: -1 })
      .lean(),
    ExpenseModel.find({ bucketId: { $in: validBuckets } })
      .sort({ paidAt: -1 })
      .limit(5000)
      .lean(),
    ExpenseModel.find({
      bucketId: { $in: validBuckets },
      paidAt: { $gte: monthStart, $lte: now },
    }).lean(),
  ]);
  return { categories, expenses, monthlyExpenses };
}

const exportRepository = {
  getExportData,
};

export default exportRepository;
