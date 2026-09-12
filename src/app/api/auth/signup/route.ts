import { NextRequest } from "next/server";

import authController from "@/controllers/auth.controller";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const user = await authController.signup(request);
    return successResponse(user, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
