export type BudgetPeriod = "weekly" | "monthly" | "yearly";

export type BudgetItem = {
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
  spent: number;
  remaining: number;
  pct: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BudgetGroup = {
  bucketId: string;
  bucketName: string;
  bucketIcon?: string;
  isPersonal?: boolean;
  budgets: BudgetItem[];
};

export type CreateBudgetPayload = {
  bucketId: string;
  categoryId?: string | null;
  amount: number;
  period: BudgetPeriod;
};

export type UpdateBudgetPayload = {
  bucketId?: string;
  categoryId?: string | null;
  amount?: number;
  period?: BudgetPeriod;
};
