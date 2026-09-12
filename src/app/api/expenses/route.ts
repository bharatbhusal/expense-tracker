import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import expenseController from "@/controllers/expense.controller";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await expenseController.createExpense(request);
    return successResponse(data, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
