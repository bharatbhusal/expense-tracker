import { NextRequest } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import budgetService from "@/services/budget.service";

async function listBudgets() {
  const auth = await getAuthPayload();
  return budgetService.listBudgetsService(auth.id);
}

async function createBudget(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json();
  return budgetService.createBudgetService(auth.id, body);
}

async function updateBudget(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  const body = await request.json();
  return budgetService.updateBudgetService(auth.id, id, body);
}

async function deleteBudget(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return budgetService.deleteBudgetService(auth.id, id);
}

const budgetController = {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};

export default budgetController;
