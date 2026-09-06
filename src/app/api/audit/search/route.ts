import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { connectToDatabase } from "@/lib/db";
import auditController from "@/controllers/audit.controller";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await auditController.searchAuditLogs(request);
    return successResponse(data);
  } catch (error) {
    return errorResponse(error);
  }
}
