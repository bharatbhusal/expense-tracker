import { auditSearchSchema } from "@/lib/validators";
import auditRepository from "@/repositories/audit.repository";
import type { AuditSearchRequest } from "@/constants/types/search.types";
import type { AuditLogType } from "@/constants/types/audit.types";

async function logAuditEvent(input: AuditLogType): Promise<void> {
  await auditRepository.createAuditLog(input);
}

function defaultAuditSearchRequest(): AuditSearchRequest {
  return {
    filterCriteria: {
      bucket: { preset: "ALL" },
      owner: { preset: "ALL" },
      date: { preset: "THIS_MONTH" },
    },
    sortCriteria: { field: "timestamp", direction: "DESC" },
    pagination: { page: 1, pageSize: 30 },
  };
}

async function searchAuditLogs(userId: string, searchRequest: unknown) {
  const parsed = auditSearchSchema.parse(searchRequest ?? {});
  const defaults = defaultAuditSearchRequest();
  const request: AuditSearchRequest = {
    filterCriteria: { ...defaults.filterCriteria, ...parsed.filterCriteria },
    sortCriteria: parsed.sortCriteria ?? defaults.sortCriteria,
    pagination: parsed.pagination ?? defaults.pagination,
  };
  return auditRepository.searchAuditLogs(userId, request);
}

const auditService = {
  searchAuditLogs,
  logAuditEvent,
};

export default auditService;

// ponytail: named alias until expense/category/bucket/budget/auth callers migrate
// to the auditService default import; delete at integration.
export { logAuditEvent };
