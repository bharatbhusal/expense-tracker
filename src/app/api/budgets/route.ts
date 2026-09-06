import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import budgetController from "@/controllers/budget.controller";

export async function GET() {
  try {
    await connectToDatabase();
    const data = await budgetController.listBudgets();
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await budgetController.createBudget(request);
    return successResponse(data, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
