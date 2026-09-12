import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import expenseController from "@/controllers/expense.controller";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await expenseController.getExpense(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await expenseController.updateExpense(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await expenseController.deleteExpense(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
