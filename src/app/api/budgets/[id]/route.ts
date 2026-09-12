import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import budgetController from "@/controllers/budget.controller";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await budgetController.updateBudget(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await budgetController.deleteBudget(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
