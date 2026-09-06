import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import bucketController from "@/controllers/bucket.controller";

export async function GET() {
  try {
    await connectToDatabase();
    const data = await bucketController.listIncomingRequests();
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
