import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import categoryController from "@/controllers/category.controller";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await categoryController.getCategory(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await categoryController.updateCategory(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await categoryController.deleteCategory(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
