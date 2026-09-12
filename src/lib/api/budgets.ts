import { apiRequest } from "@/lib/api/client";
import type {
  BudgetGroup,
  BudgetItem,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from "@/constants/types/budget.types";
import type { CategoryItem } from "@/constants/types/expense.types";
import type { SearchResult } from "@/constants/types/search.types";

export const budgetsApi = {
  list: () => apiRequest<BudgetGroup[]>("/budgets", { method: "GET" }),
  create: (payload: CreateBudgetPayload) =>
    apiRequest<BudgetItem>("/budgets", { method: "POST", body: payload }),
  update: (id: string, payload: UpdateBudgetPayload) =>
    apiRequest<BudgetItem>(`/budgets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    }),
  remove: (id: string) =>
    apiRequest<{ message: string }>(`/budgets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  // used by budget-form to load categories for selected bucket without inlining apiRequest
  searchCategories: (bucketId: string) =>
    apiRequest<SearchResult<CategoryItem>>("/categories/search", {
      method: "POST",
      body: {
        filterCriteria: {
          bucket: { preset: "MULTIPLE", ids: [bucketId] },
          owner: { preset: "ALL" },
          date: { preset: "THIS_MONTH" },
        },
        sortCriteria: { field: "name", direction: "ASC" },
        pagination: { page: 1, pageSize: 100 },
      },
    }),
};

// ponytail: alias expected by callers that import `searchBuckets` from this module
export const searchBuckets = budgetsApi.searchCategories;
