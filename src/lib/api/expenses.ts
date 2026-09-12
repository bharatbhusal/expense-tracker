import { apiRequest } from "@/lib/api/client";
import type {
  CategoryItem,
  CreateExpensePayload,
  ExpenseItem,
} from "@/constants/types/expense.types";
import type {
  CategoryBreakdownPoint,
  CategoryRangeStats,
  CategoryStatsSummary,
  CategoryWithStats,
  ChartData,
  DashboardCard,
  DistributionPoint,
  ExpenseContribution,
  CategoryItem as CategoryItemAanlytics,
} from "@/constants/types/analytics.types";
import type {
  CategoryFilterCriteria,
  CategorySearchRequest,
  DistributionDimension,
  ExpenseFilterCriteria,
  ExpenseSearchRequest,
  SearchResult,
  SortCriteria,
} from "@/constants/types/search.types";

export const expensesApi = {
  searchExpenses: (request: ExpenseSearchRequest) =>
    apiRequest<SearchResult<ExpenseItem>>("/expenses/search", {
      method: "POST",
      body: request,
    }),

  searchCategories: (request: CategorySearchRequest) =>
    apiRequest<SearchResult<CategoryItem>>("/categories/search", {
      method: "POST",
      body: request,
    }),

  getExpenseById: (id: string) => apiRequest<ExpenseItem>(`/expenses/${id}`),

  getExpenseContribution: (id: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    const url = `/expenses/${encodeURIComponent(id)}/contribution${qs ? `?${qs}` : ""}`;
    return apiRequest<ExpenseContribution>(url);
  },

  createExpense: (payload: CreateExpensePayload) =>
    apiRequest<ExpenseItem>("/expenses", {
      method: "POST",
      body: payload,
    }),

  updateExpense: (id: string, payload: Partial<CreateExpensePayload>) =>
    apiRequest<ExpenseItem>(`/expenses/${id}`, {
      method: "PUT",
      body: payload,
    }),

  deleteExpense: (id: string) =>
    apiRequest<{ message: string }>(`/expenses/${id}`, {
      method: "DELETE",
    }),

  getOverviewStats: (body: { filterCriteria: ExpenseFilterCriteria }) =>
    apiRequest<DashboardCard[]>("/expenses/overview", {
      method: "POST",
      body,
    }),

  getChartData: (body: { filterCriteria: ExpenseFilterCriteria }) =>
    apiRequest<ChartData>("/expenses/chart", {
      method: "POST",
      body,
    }),

  createCategory: (payload: { name: string; color?: string; emoji?: string; bucketId: string }) =>
    apiRequest<CategoryItem>("/categories", {
      method: "POST",
      body: payload,
    }),

  getCategoryById: (id: string, from: string, to: string) =>
    apiRequest<CategoryItemAanlytics>(
      `/categories/${id}/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),

  updateCategory: (
    id: string,
    payload: {
      name: string;
      color?: string;
      emoji?: string;
      bucketId: string;
    },
  ) =>
    apiRequest<CategoryItemAanlytics>(`/categories/${id}`, {
      method: "PUT",
      body: payload,
    }),

  deleteCategory: (id: string) =>
    apiRequest<{ message: string }>(`/categories/${id}`, {
      method: "DELETE",
    }),

  getCategoryStats: (id: string, from: string, to: string) =>
    apiRequest<CategoryRangeStats>(
      `/categories/${id}/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),

  getCategoryDistribution: (filterCriteria: ExpenseFilterCriteria) =>
    apiRequest<CategoryBreakdownPoint[]>("/categories/distribution", {
      method: "POST",
      body: { filterCriteria },
    }),

  getDistribution: (dimension: DistributionDimension, filterCriteria: ExpenseFilterCriteria) =>
    apiRequest<DistributionPoint[]>("/expenses/distribution", {
      method: "POST",
      body: { dimension, filterCriteria },
    }),

  getCategoryStatsSummary: (filterCriteria: CategoryFilterCriteria) =>
    apiRequest<CategoryStatsSummary>("/categories/stats-summary", {
      method: "POST",
      body: { filterCriteria },
    }),

  listCategoriesWithStats: ({
    filterCriteria,
    sortCriteria,
  }: {
    filterCriteria: CategoryFilterCriteria;
    sortCriteria?: SortCriteria;
  }) =>
    apiRequest<CategoryWithStats>("/categories/stats", {
      method: "POST",
      body: { filterCriteria, sortCriteria },
    }),
};
