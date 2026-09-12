import type { PaginationMeta } from "@/constants/types/common.types";

export type ExpenseLocation = {
  latitude: number;
  longitude: number;
  address?: string;
};

export type ExpenseItem = {
  _id: string;
  title: string;
  amount: number;
  currency: string;
  paidAt: string;
  categoryId: string;
  categoryColor?: string;
  categoryEmoji?: string;
  notes?: string;
  images: string[];
  location: ExpenseLocation;
  bucketId?: string;
  userId?: string;
  posterName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryItem = {
  _id: string;
  name: string;
  color: string;
  emoji?: string;
  userId?: string;
  bucketId?: string;
};

export type ExpensesListPayload = PaginationMeta & {
  items: ExpenseItem[];
};

export type CreateExpensePayload = {
  title: string;
  amount: number;
  categoryId: string;
  bucketId: string;
  images: string[];
  location: ExpenseLocation;
  currency: string;
  paidAt: string;
  notes?: string;
};
