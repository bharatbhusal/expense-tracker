import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import bucketController from "@/controllers/bucket.controller";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await bucketController.updateBucket(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const data = await bucketController.deleteBucket(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
