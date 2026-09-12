import { NextRequest } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import exportService from "@/services/export.service";

async function getExport(request: NextRequest) {
  const auth = await getAuthPayload();
  const type = request.nextUrl.searchParams.get("type");
  return exportService.getExport(auth.id, type);
}

const exportController = {
  getExport,
};

export default exportController;
