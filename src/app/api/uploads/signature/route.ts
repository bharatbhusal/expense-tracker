import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import uploadController from "@/controllers/upload.controller";

export async function GET(request: NextRequest) {
  try {
    const data = await uploadController.getSignature(request);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
