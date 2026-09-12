import { Types } from "mongoose";

import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { BUCKET_ERRORS, ERROR_CODES, USER_ERRORS } from "@/constants/error-messages";
import { buildBucketStatsExpenseMatch } from "@/lib/query-builders";
import {
  bucketSchema,
  bucketSearchSchema,
  bucketStatsSchema,
  inviteSchema,
} from "@/lib/validators";
import bucketRepository, { type BucketDoc } from "@/repositories/bucket.repository";
import {
  ensureCategoryInBucket,
  deleteCategoriesByBucket,
} from "@/repositories/category.repository";
import userRepository from "@/repositories/user.repository";
import { logAuditEvent } from "@/services/audit.service";
import type {
  BucketDetail,
  BucketPreview,
  BucketsListPayload,
  BucketSummary,
  IncomingRequestsGroup,
} from "@/constants/types/bucket.types";
import type { BucketSearchRequest, ExpenseFilterCriteria } from "@/constants/types/search.types";
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/constants/types/audit.types";

async function listBuckets(userId: string): Promise<BucketsListPayload> {
  const [accepted, invitations] = await Promise.all([
    bucketRepository.listBucketsForMember(userId),
    bucketRepository.listBucketsForPendingMember(userId),
  ]);

  const items: BucketSummary[] = accepted.map((bucket) => toSummary(bucket, userId));

  return {
    items,
    invitations: invitations.map((bucket) => toSummary(bucket, userId)),
  };
}

async function createBucket(userId: string, body: unknown): Promise<BucketDetail> {
  const payload = bucketSchema.parse(body);

  const bucket = await bucketRepository.createBucket({
    name: payload.name,
    icon: payload.icon,
    ownerId: userId,
    members: [
      {
        userId,
        role: "owner",
        status: "accepted",
        joinedAt: new Date(),
      },
    ],
  });

  for (const category of DEFAULT_CATEGORIES) {
    await ensureCategoryInBucket(userId, bucket._id.toString(), category);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId: bucket._id.toString(),
    action: AUDIT_ACTIONS.CREATE,
    entity: AUDIT_ENTITIES.BUCKET,
    entityId: bucket._id.toString(),
    note: `Created bucket "${bucket.name}"`,
  });

  return toDetail(bucket);
}

async function getBucketStats(
  userId: string,
  bucketId: string,
  body: unknown,
): Promise<BucketDetail> {
  const parsed = bucketStatsSchema.parse(body ?? {});
  const bucket = await bucketRepository.findBucketById(bucketId);
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  const member = bucket.members.find((m) => m.userId.toString() === userId);
  if (!member || member.status !== "accepted") {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }
  const detail = await toDetail(bucket);
  const criteria = parsed.filterCriteria ?? {};
  const filters: ExpenseFilterCriteria = {
    bucket: { preset: "ALL" },
    category: { preset: "ALL" },
    owner: { preset: "ALL" },
    date: { preset: "THIS_MONTH" },
    ...criteria,
  };
  const expenseMatch = buildBucketStatsExpenseMatch(userId, filters);
  const stats = await bucketRepository.getFilteredBucketExpenseStats(bucketId, expenseMatch);
  return {
    ...detail,
    role: member.role,
    status: member.status,
    totalAmount: stats.total,
    expenseCount: stats.count,
  };
}

async function updateBucket(
  userId: string,
  bucketId: string,
  body: unknown,
): Promise<BucketDetail> {
  const payload = bucketSchema.parse(body);
  await requireOwner(userId, bucketId);
  const bucket = await bucketRepository.updateBucketName(bucketId, {
    name: payload.name,
    icon: payload.icon,
  });
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.UPDATE,
    entity: AUDIT_ENTITIES.BUCKET,
    entityId: bucketId,
    note: `Updated bucket "${payload.name}"`,
  });

  return toDetail(bucket);
}

async function deleteBucket(userId: string, bucketId: string) {
  const bucket = await requireOwner(userId, bucketId);
  const hasExpenses = await bucketRepository.expenseExistsInBucket(bucketId);
  if (hasExpenses) {
    throw new AppError(BUCKET_ERRORS.HAS_EXPENSES, 400, ERROR_CODES.HAS_EXPENSES);
  }

  await deleteCategoriesByBucket(bucketId);
  await bucketRepository.deleteBucket(bucketId);

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.DELETE,
    entity: AUDIT_ENTITIES.BUCKET,
    entityId: bucketId,
    note: `Deleted bucket "${bucket.name}"`,
  });

  return { message: "Bucket deleted" };
}

async function inviteUser(userId: string, bucketId: string, body: unknown): Promise<BucketDetail> {
  const payload = inviteSchema.parse(body);
  const bucket = await requireOwner(userId, bucketId);

  const user = await userRepository.findUserByUsername(payload.username);
  if (!user) {
    throw new AppError(USER_ERRORS.NOT_FOUND, 404, ERROR_CODES.USER_NOT_FOUND);
  }
  const targetId = user._id.toString();
  if (bucket.members.some((m) => m.userId.toString() === targetId)) {
    throw new AppError(BUCKET_ERRORS.ALREADY_MEMBER_BUCKET, 409, ERROR_CODES.ALREADY_MEMBER);
  }

  const updated = await bucketRepository.addBucketMember(bucketId, {
    userId: targetId,
    role: "member",
    status: "pending",
    invitedBy: userId,
    invitedAt: new Date(),
  });
  if (!updated) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.INVITE,
    entity: AUDIT_ENTITIES.MEMBER,
    entityId: bucketId,
    note: `Invited @${user.username} to ${bucket.name}`,
    metadata: { targetUserId: targetId },
  });

  return toDetail(updated);
}

async function acceptInvite(userId: string, bucketId: string): Promise<BucketDetail> {
  const bucketDoc = await requirePendingMember(userId, bucketId);
  const member = bucketDoc.members.find((m) => m.userId.toString() === userId);
  // self-requested pending must be approved by owner, not self-accepted
  if (member?.invitedBy && member.invitedBy.toString() === userId) {
    throw new AppError(BUCKET_ERRORS.REQUEST_PENDING, 403, ERROR_CODES.REQUEST_PENDING);
  }
  const bucket = await bucketRepository.acceptBucketMember(bucketId, userId, new Date());
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.ACCEPT,
    entity: AUDIT_ENTITIES.MEMBER,
    entityId: bucketId,
    note: `Joined bucket "${bucket.name}"`,
  });

  return toDetail(bucket);
}

async function declineInvite(userId: string, bucketId: string): Promise<BucketSummary> {
  const bucket = await requirePendingMember(userId, bucketId);
  await bucketRepository.pullBucketMember(bucketId, userId);

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.DECLINE,
    entity: AUDIT_ENTITIES.MEMBER,
    entityId: bucketId,
    note: `Declined invite to "${bucket.name}"`,
  });

  return {
    _id: bucket._id.toString(),
    name: bucket.name,
    icon: bucket.icon,
    ownerId: bucket.ownerId.toString(),
    isPersonal: bucket.isPersonal,
    memberCount: bucket.members.length,
    role: "member",
    status: "pending",
  };
}

async function leaveBucket(userId: string, bucketId: string) {
  const bucket = await bucketRepository.findBucketById(bucketId);
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  const member = bucket.members.find((m) => m.userId.toString() === userId);
  if (!member || member.status !== "accepted") {
    throw new AppError(BUCKET_ERRORS.NOT_MEMBER, 403, ERROR_CODES.NOT_A_MEMBER);
  }
  if (member.role === "owner") {
    throw new AppError(BUCKET_ERRORS.OWNER_CANNOT_LEAVE, 400, ERROR_CODES.OWNER_CANNOT_LEAVE);
  }

  await bucketRepository.pullBucketMember(bucketId, userId);

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.LEAVE,
    entity: AUDIT_ENTITIES.MEMBER,
    entityId: bucketId,
    note: `Left bucket "${bucket.name}"`,
  });

  return { message: "Left the bucket" };
}

async function revokeInvite(
  userId: string,
  bucketId: string,
  targetUserId: string,
): Promise<BucketDetail> {
  const bucket = await requireOwner(userId, bucketId);
  if (!bucket.members.some((m) => m.userId.toString() === targetUserId)) {
    throw new AppError(BUCKET_ERRORS.MEMBER_NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  const updated = await bucketRepository.pullBucketMember(bucketId, targetUserId);
  if (!updated) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.REVOKE,
    entity: AUDIT_ENTITIES.MEMBER,
    entityId: bucketId,
    note: `Revoked invite for member of "${bucket.name}"`,
    metadata: { targetUserId },
  });

  return toDetail(updated);
}

async function getBucketPreview(userId: string, bucketId: string): Promise<BucketPreview> {
  const bucket = await bucketRepository.findBucketById(bucketId);
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  if (bucket.isPersonal) {
    throw new AppError(BUCKET_ERRORS.IS_PERSONAL, 400, ERROR_CODES.BUCKET_IS_PERSONAL);
  }
  const users = await bucketRepository.findUsersByIds([bucket.ownerId.toString()]);
  const owner = users[0];
  const member = bucket.members.find((m) => m.userId.toString() === userId);
  return {
    _id: bucket._id.toString(),
    name: bucket.name,
    icon: bucket.icon,
    ownerId: bucket.ownerId.toString(),
    ownerName: owner?.name,
    isPersonal: bucket.isPersonal,
    memberCount: bucket.members.length,
    role: member?.role,
    status: member?.status,
  };
}

async function requestToJoin(userId: string, bucketId: string): Promise<BucketPreview> {
  const bucket = await bucketRepository.findBucketById(bucketId);
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  if (bucket.isPersonal) {
    throw new AppError(BUCKET_ERRORS.IS_PERSONAL, 400, ERROR_CODES.BUCKET_IS_PERSONAL);
  }
  const existing = bucket.members.find((m) => m.userId.toString() === userId);
  if (existing) {
    if (existing.status === "accepted") {
      throw new AppError(BUCKET_ERRORS.ALREADY_MEMBER_SELF, 409, ERROR_CODES.ALREADY_MEMBER);
    }
    throw new AppError(BUCKET_ERRORS.ALREADY_PENDING, 409, ERROR_CODES.ALREADY_PENDING);
  }
  await bucketRepository.addBucketMember(bucketId, {
    userId,
    role: "member",
    status: "pending",
    invitedBy: userId,
    invitedAt: new Date(),
  });

  await logAuditEvent({
    actorId: userId,
    bucketId,
    action: AUDIT_ACTIONS.REQUEST,
    entity: AUDIT_ENTITIES.MEMBER,
    entityId: bucketId,
    note: `Requested to join "${bucket.name}"`,
    metadata: { targetUserId: userId },
  });

  // also notify owner via same audit stream; owner sees it in audit logs
  const preview = await getBucketPreview(userId, bucketId);
  return preview;
}

async function listIncomingRequests(userId: string): Promise<IncomingRequestsGroup[]> {
  const buckets = await bucketRepository.listOwnerPendingRequests(userId);
  if (buckets.length === 0) return [];
  // only self-requested pending (invitedBy === userId of the pending member) are join requests
  const isJoinRequest = (m: {
    userId: Types.ObjectId;
    invitedBy?: Types.ObjectId;
    status: string;
  }) => m.status === "pending" && m.invitedBy?.toString() === m.userId.toString();

  const pendingUserIds = [
    ...new Set(
      buckets.flatMap((b) => b.members.filter(isJoinRequest).map((m) => m.userId.toString())),
    ),
  ];
  if (pendingUserIds.length === 0) return [];
  const users = await bucketRepository.findUsersByIds(pendingUserIds);
  const userById = new Map(users.map((u) => [u._id.toString(), u]));
  return buckets
    .map((bucket) => ({
      bucketId: bucket._id.toString(),
      name: bucket.name,
      icon: bucket.icon,
      requests: bucket.members.filter(isJoinRequest).map((m) => {
        const user = userById.get(m.userId.toString());
        return {
          userId: m.userId.toString(),
          name: user?.name ?? "",
          username: user?.username,
          invitedAt: m.invitedAt?.toISOString(),
        };
      }),
    }))
    .filter((g) => g.requests.length > 0);
}

async function acceptRequest(
  ownerId: string,
  bucketId: string,
  targetUserId: string,
): Promise<BucketDetail> {
  const bucket = await requireOwner(ownerId, bucketId);
  const member = bucket.members.find((m) => m.userId.toString() === targetUserId);
  if (!member) {
    throw new AppError(BUCKET_ERRORS.REQUEST_NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  if (member.status !== "pending") {
    throw new AppError(BUCKET_ERRORS.ALREADY_MEMBER, 409, ERROR_CODES.ALREADY_MEMBER);
  }
  // only self-requested joins (invitedBy === target) are approvable here; owner invites are accepted by the invitee
  if (member.invitedBy && member.invitedBy.toString() !== targetUserId) {
    throw new AppError(BUCKET_ERRORS.NOT_JOIN_REQUEST, 400, ERROR_CODES.NOT_JOIN_REQUEST);
  }
  const updated = await bucketRepository.acceptBucketMember(bucketId, targetUserId, new Date());
  if (!updated) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  await logAuditEvent({
    actorId: ownerId,
    bucketId,
    action: AUDIT_ACTIONS.ACCEPT,
    entity: AUDIT_ENTITIES.MEMBER,
    entityId: bucketId,
    note: `Approved join request for "${bucket.name}"`,
    metadata: { targetUserId },
  });
  return toDetail(updated);
}

async function searchBuckets(userId: string, searchRequest: unknown) {
  const parsed = bucketSearchSchema.parse(searchRequest ?? {});
  const defaults = defaultBucketSearchRequest();

  const request: BucketSearchRequest = {
    filterCriteria: { ...defaults.filterCriteria, ...parsed.filterCriteria },
    sortCriteria: parsed.sortCriteria ?? defaults.sortCriteria,
    pagination: parsed.pagination ?? defaults.pagination,
  };
  return bucketRepository.searchBuckets(userId, request);
}

async function requireOwner(userId: string, bucketId: string): Promise<BucketDoc> {
  const bucket = await bucketRepository.findBucketById(bucketId);
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  const member = bucket.members.find((m) => m.userId.toString() === userId);
  if (!member || member.role !== "owner") {
    throw new AppError(BUCKET_ERRORS.OWNER_ONLY, 403, ERROR_CODES.OWNER_ONLY);
  }
  if (bucket.isPersonal) {
    throw new AppError(
      BUCKET_ERRORS.PERSONAL_ACTION_NOT_ALLOWED,
      400,
      ERROR_CODES.BUCKET_IS_PERSONAL,
    );
  }
  return bucket;
}

async function requirePendingMember(userId: string, bucketId: string): Promise<BucketDoc> {
  const bucket = await bucketRepository.findBucketById(bucketId);
  if (!bucket) {
    throw new AppError(BUCKET_ERRORS.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }
  const member = bucket.members.find((m) => m.userId.toString() === userId);
  if (!member || member.status !== "pending") {
    throw new AppError(BUCKET_ERRORS.NOT_INVITED, 403, ERROR_CODES.NOT_INVITED);
  }
  return bucket;
}

function toSummary(bucket: BucketDoc, userId: string): BucketSummary {
  const member = bucket.members.find((m) => m.userId.toString() === userId);
  return {
    _id: bucket._id.toString(),
    name: bucket.name,
    icon: bucket.icon,
    ownerId: bucket.ownerId.toString(),
    isPersonal: bucket.isPersonal,
    memberCount: bucket.members.length,
    role: member?.role ?? "member",
    status: member?.status ?? "pending",
  };
}

async function toDetail(bucket: BucketDoc): Promise<BucketDetail> {
  const users = await bucketRepository.findUsersByIds(
    bucket.members.map((m) => m.userId.toString()),
  );
  const userById = new Map(users.map((u) => [u._id.toString(), u]));

  const owner = bucket.members.find((m) => m.role === "owner");

  return {
    _id: bucket._id.toString(),
    name: bucket.name,
    icon: bucket.icon,
    ownerId: bucket.ownerId.toString(),
    ownerName: owner ? userById.get(owner.userId.toString())?.name : undefined,
    isPersonal: bucket.isPersonal,
    memberCount: bucket.members.length,
    members: bucket.members.map((m) => {
      const user = userById.get(m.userId.toString());
      return {
        userId: m.userId.toString(),
        name: user?.name ?? "",
        username: user?.username,
        role: m.role,
        status: m.status,
        invitedBy: m.invitedBy?.toString(),
        invitedAt: m.invitedAt?.toISOString(),
        joinedAt: m.joinedAt?.toISOString(),
      };
    }),
    createdAt: bucket.createdAt?.toISOString(),
    updatedAt: bucket.updatedAt?.toISOString(),
  };
}

function defaultBucketSearchRequest(): BucketSearchRequest {
  return {
    filterCriteria: {
      date: { preset: "THIS_MONTH" },
    },
    sortCriteria: { field: "createdAt", direction: "DESC" },
    pagination: { page: 1, pageSize: 20 },
  };
}

const bucketService = {
  listBuckets,
  createBucket,
  getBucketStats,
  updateBucket,
  deleteBucket,
  inviteUser,
  acceptInvite,
  declineInvite,
  leaveBucket,
  revokeInvite,
  getBucketPreview,
  requestToJoin,
  listIncomingRequests,
  acceptRequest,
  searchBuckets,
};

export default bucketService;
