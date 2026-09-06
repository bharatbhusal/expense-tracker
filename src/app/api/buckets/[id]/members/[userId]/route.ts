import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import bucketController from "@/controllers/bucket.controller";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    await connectToDatabase();
    const data = await bucketController.revokeInvite(request, context);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
