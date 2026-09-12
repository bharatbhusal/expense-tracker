import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import authController from "@/controllers/auth.controller";

export async function POST() {
  try {
    await connectToDatabase();
    const data = await authController.logout();
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
