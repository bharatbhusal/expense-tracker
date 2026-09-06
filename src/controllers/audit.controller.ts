import { NextRequest } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import auditService from "@/services/audit.service";

async function searchAuditLogs(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json().catch(() => ({}));
  return auditService.searchAuditLogs(auth.id, body);
}

const auditController = {
  searchAuditLogs,
};

export default auditController;
