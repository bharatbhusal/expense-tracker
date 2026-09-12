import { NextRequest } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import expenseService from "@/services/expense.service";

async function searchExpenses(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json();
  return expenseService.searchExpenses(auth.id, body);
}

async function createExpense(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json();
  return expenseService.createExpense(auth, body);
}

async function getExpenseOverviewStats(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json().catch(() => ({}));
  return expenseService.getExpenseOverviewStats(auth.id, body);
}

async function getChartData(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json().catch(() => ({}));
  return expenseService.getChartData(auth.id, body);
}

async function getExpense(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return expenseService.getExpense(auth.id, id);
}

async function updateExpense(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  const body = await request.json();
  return expenseService.updateExpense(auth.id, id, body);
}

async function deleteExpense(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return expenseService.deleteExpense(auth.id, id);
}

const expenseController = {
  searchExpenses,
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  getExpenseOverviewStats,
  getChartData,
};

export default expenseController;
