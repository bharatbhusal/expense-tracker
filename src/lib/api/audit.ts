import { apiRequest } from "@/lib/api/client";
import type { AuditSearchRequest, SearchResult } from "@/constants/types/search.types";

export type AuditLogItem = {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  note?: string;
  actorId?: string;
  actorName?: string;
  actorUsername?: string;
  bucketId?: string;
  bucketName?: string;
  bucketIcon?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type AuditLogsListPayload = {
  items: AuditLogItem[];
  total: number;
  page: number;
  totalPages: number;
};

export type AuditLogListQuery = {
  page?: number;
  limit?: number;
  sortBy?: "timestamp" | "action" | "entity";
  order?: "asc" | "desc";
};

export const auditApi = {
  searchLogs: (request: AuditSearchRequest) =>
    apiRequest<SearchResult<AuditLogItem>>("/audit/search", {
      method: "POST",
      body: request,
    }),
};
