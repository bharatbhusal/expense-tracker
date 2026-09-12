import { AppError } from "@/lib/errors";
import { VALIDATION_ERRORS } from "@/constants/error-messages";
import { buildTimestampedFilename } from "@/lib/naming";
import { getValidBuckets } from "@/lib/query-builders/membership";
import exportRepository from "@/repositories/export.repository";

export type ExportType = "all" | "expenses" | "categories";

async function getExport(userId: string, type?: string | null) {
  if (type && type !== "all" && type !== "expenses" && type !== "categories") {
    throw new AppError(VALIDATION_ERRORS.INVALID_FIELD("type"), 400);
  }
  const validBuckets = await getValidBuckets(userId);
  const { categories, expenses, monthlyExpenses } =
    await exportRepository.getExportData(validBuckets);

  const exportedAt = new Date().toISOString();
  const analytics = {
    totalMonthlySpend: monthlyExpenses.reduce((sum, item) => sum + item.amount, 0),
    expenseCount: expenses.length,
    categoryCount: categories.length,
    exportGeneratedAt: exportedAt,
  };
  const normalizedPayload = {
    exportedAt,
    analytics,
    categories: categories.map((category) => ({
      id: (category._id as { toString(): string }).toString(),
      name: category.name,
      color: category.color,
      createdAt: (category as { createdAt?: Date }).createdAt?.toISOString(),
    })),
    expenses: expenses.map((expense) => ({
      id: (expense._id as { toString(): string }).toString(),
      title: expense.title,
      amount: expense.amount,
      categoryId: (expense.categoryId as { toString(): string }).toString(),
      categoryName:
        categories.find(
          (category) =>
            (category._id as { toString(): string }).toString() ===
            (expense.categoryId as { toString(): string }).toString(),
        )?.name ?? "Unknown",
      images: expense.images,
      location: expense.location,
      currency: expense.currency,
      paidAt: (expense.paidAt as Date).toISOString(),
      createdAt: (expense as { createdAt?: Date }).createdAt?.toISOString(),
    })),
  };

  const payload =
    !type || type === "all"
      ? normalizedPayload
      : type === "expenses"
        ? { expenses: normalizedPayload.expenses }
        : { categories: normalizedPayload.categories };

  return {
    data: JSON.stringify(payload, null, 2),
    filename: buildTimestampedFilename({
      baseName: `expense_report${type ? `_${type}` : ""}`,
      extension: "json",
    }),
    mimeType: "application/json;charset=utf-8",
    exportedAt,
  };
}

const exportService = {
  getExport,
};

export default exportService;
