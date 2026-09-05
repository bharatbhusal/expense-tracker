import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import exportController from "@/controllers/export.controller";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await exportController.getExport(request);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
