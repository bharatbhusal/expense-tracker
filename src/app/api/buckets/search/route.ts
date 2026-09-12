import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import bucketController from "@/controllers/bucket.controller";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await bucketController.searchBuckets(request);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
