import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import userController from "@/controllers/user.controller";

export async function GET() {
  try {
    await connectToDatabase();
    const data = await userController.getAuthUser();
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
