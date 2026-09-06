import { Types } from "mongoose";

import { buildAuditQuery } from "@/lib/query-builders";
import { AuditLogModel } from "@/models/AuditLog";
import type { AuditSearchRequest } from "@/constants/types/search.types";
import type { AuditLogType } from "@/constants/types/audit.types";

async function createAuditLog(input: AuditLogType) {
  const log = await AuditLogModel.create({
    ...input,
    timestamp: new Date(),
    metadata: input.metadata ?? {},
  });

  return log.toObject();
}

function toAuditItem(log: Record<string, unknown>) {
  const actor = log.actorId as
    | {
        _id?: Types.ObjectId;
        name?: string;
        username?: string;
      }
    | null
    | undefined;
  const bucket = log.bucketId as
    { _id?: Types.ObjectId; name?: string; icon?: string } | null | undefined;

  return {
    _id: (log._id as Types.ObjectId).toString(),
    action: log.action as string,
    entity: log.entity as string,
    ...(log.entityId ? { entityId: log.entityId as string } : {}),
    ...(log.note ? { note: log.note as string } : {}),
    metadata: log.metadata as Record<string, unknown>,
    timestamp: (log.timestamp as Date).toISOString(),
    ...(actor?._id ? { actorId: actor._id.toString() } : {}),
    ...(actor?.name ? { actorName: actor.name } : {}),
    ...(actor?.username ? { actorUsername: actor.username } : {}),
    ...(bucket?._id ? { bucketId: bucket._id.toString() } : {}),
    ...(bucket?.name ? { bucketName: bucket.name } : {}),
    ...(bucket?.icon ? { bucketIcon: bucket.icon } : {}),
  };
}

async function searchAuditLogs(userId: string, request: AuditSearchRequest) {
  const { query, sort, skip, limit } = await buildAuditQuery(userId, request);

  const [logs, total] = await Promise.all([
    AuditLogModel.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("actorId", "name username")
      .populate("bucketId", "name icon")
      .lean(),
    AuditLogModel.countDocuments(query),
  ]);

  return {
    items: logs.map(toAuditItem),
    total,
    page: request.pagination.page,
    totalPages: Math.ceil(total / request.pagination.pageSize) || 1,
  };
}

const auditRepository = {
  createAuditLog,
  searchAuditLogs,
};

export default auditRepository;
