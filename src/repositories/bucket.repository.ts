import { Types } from "mongoose";

import { applyDateFilter, applyOwnerFilter, buildBucketQuery } from "@/lib/query-builders";
import { BucketModel } from "@/models/Bucket";
import { ExpenseModel } from "@/models/Expense";
import { UserModel } from "@/models/User";
import type { BucketSearchRequest, SearchResult } from "@/constants/types/search.types";
import type { BucketSummary } from "@/constants/types/bucket.types";

export type BucketMemberDoc = {
  userId: Types.ObjectId;
  role: "owner" | "member";
  status: "pending" | "accepted";
  invitedBy?: Types.ObjectId;
  invitedAt?: Date;
  joinedAt?: Date;
};

export type BucketDoc = {
  _id: Types.ObjectId;
  name: string;
  icon?: string;
  ownerId: Types.ObjectId;
  isPersonal?: boolean;
  members: BucketMemberDoc[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type BucketMemberInput = {
  userId: string;
  role: "owner" | "member";
  status: "pending" | "accepted";
  invitedBy?: string;
  invitedAt?: Date;
  joinedAt?: Date;
};

export async function listBucketsForMember(userId: string) {
  const buckets = await BucketModel.find({
    members: {
      $elemMatch: {
        userId: new Types.ObjectId(userId),
        status: "accepted",
      },
    },
  }).lean();
  return buckets as unknown as BucketDoc[];
}

export async function isMember(userId: string, bucketId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(bucketId)) {
    return false;
  }

  return !!(await BucketModel.exists({
    _id: bucketId,
    members: {
      $elemMatch: {
        userId: new Types.ObjectId(userId),
        status: "accepted",
      },
    },
  }));
}

export async function listBucketsForPendingMember(userId: string) {
  // exclude self-requested pending (invitedBy === userId) — those need owner approval
  const buckets = await BucketModel.find({
    members: {
      $elemMatch: {
        userId: new Types.ObjectId(userId),
        status: "pending",
        invitedBy: { $ne: new Types.ObjectId(userId) },
      },
    },
  }).lean();
  return buckets as unknown as BucketDoc[];
}

export async function findBucketById(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  const bucket = await BucketModel.findById(id).lean();
  return (bucket as unknown as BucketDoc | null) ?? null;
}

export async function createBucket(data: {
  name: string;
  icon?: string;
  ownerId: string;
  isPersonal?: boolean;
  members: BucketMemberInput[];
}) {
  const bucket = await BucketModel.create(data);
  return bucket.toObject() as unknown as BucketDoc;
}

export async function updateBucketName(id: string, data: { name: string; icon?: string }) {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  const bucket = await BucketModel.findByIdAndUpdate(
    id,
    {
      $set: {
        name: data.name,
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
      },
    },
    { new: true, lean: true },
  );
  return (bucket as unknown as BucketDoc | null) ?? null;
}

export async function deleteBucket(id: string) {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  return BucketModel.findByIdAndDelete(id).lean();
}

export async function addBucketMember(id: string, member: BucketMemberInput) {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  const bucket = await BucketModel.findByIdAndUpdate(
    id,
    { $push: { members: member } },
    { new: true, lean: true },
  );
  return (bucket as unknown as BucketDoc | null) ?? null;
}

export async function acceptBucketMember(id: string, userId: string, joinedAt: Date) {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  const bucket = await BucketModel.findOneAndUpdate(
    { _id: id, "members.userId": new Types.ObjectId(userId) },
    {
      $set: {
        "members.$.status": "accepted",
        "members.$.joinedAt": joinedAt,
      },
    },
    { new: true, lean: true },
  );
  return (bucket as unknown as BucketDoc | null) ?? null;
}

export async function pullBucketMember(id: string, userId: string) {
  if (!Types.ObjectId.isValid(id)) {
    return null;
  }
  const bucket = await BucketModel.findByIdAndUpdate(
    id,
    {
      $pull: {
        members: { userId: new Types.ObjectId(userId) },
      },
    },
    { new: true, lean: true },
  );
  return (bucket as unknown as BucketDoc | null) ?? null;
}

export async function expenseExistsInBucket(bucketId: string) {
  if (!Types.ObjectId.isValid(bucketId)) {
    return false;
  }
  return Boolean(
    await ExpenseModel.exists({
      bucketId: new Types.ObjectId(bucketId),
    }),
  );
}

export async function getFilteredBucketExpenseStats(
  bucketId: string,
  expenseMatch: Record<string, unknown>,
) {
  if (!Types.ObjectId.isValid(bucketId)) {
    return { total: 0, count: 0 };
  }
  const match = {
    bucketId: new Types.ObjectId(bucketId),
    ...expenseMatch,
  };
  const [result] = await ExpenseModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);
  return {
    total: result?.total ?? 0,
    count: result?.count ?? 0,
  };
}

export async function findUsersByIds(ids: string[]) {
  return UserModel.find({ _id: { $in: ids } })
    .select("name username")
    .lean();
}

export async function findBucketByUserId(userId: string) {
  return BucketModel.findOne({ ownerId: userId }).lean();
}

export async function listOwnerPendingRequests(userId: string) {
  const buckets = await BucketModel.find({
    ownerId: new Types.ObjectId(userId),
    "members.status": "pending",
  }).lean();
  return buckets as unknown as BucketDoc[];
}

export async function searchBuckets(
  userId: string,
  request: BucketSearchRequest,
): Promise<SearchResult<BucketSummary>> {
  const { query, sort, skip, limit } = await buildBucketQuery(userId, request);

  const expenseMatch = buildExpenseMatch(userId, request.filterCriteria);

  const [items, total] = await Promise.all([
    BucketModel.aggregate([
      { $match: query },
      { $addFields: { memberCount: { $size: "$members" } } },
      {
        $lookup: {
          from: "expenses",
          let: { bucketId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$bucketId", "$$bucketId"],
                },
                ...expenseMatch,
              },
            },
          ],
          as: "bucketExpenses",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "ownerUser",
        },
      },
      {
        $addFields: {
          totalAmount: { $sum: "$bucketExpenses.amount" },
          expenseCount: { $size: "$bucketExpenses" },
          ownerName: { $arrayElemAt: ["$ownerUser.name", 0] },
        },
      },
      { $project: { bucketExpenses: 0, ownerUser: 0 } },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
    ]),
    BucketModel.countDocuments(query),
  ]);

  return {
    items: items.map((bucket) => {
      const member = bucket.members.find((m: BucketMemberDoc) => m.userId.toString() === userId);
      return {
        _id: bucket._id.toString(),
        name: bucket.name,
        icon: bucket.icon,
        ownerId: bucket.ownerId.toString(),
        ownerName: bucket.ownerName,
        isPersonal: bucket.isPersonal,
        memberCount: bucket.memberCount,
        totalAmount: bucket.totalAmount,
        expenseCount: bucket.expenseCount,
        createdAt: bucket.createdAt?.toISOString(),
        role: (member?.role ?? "member") as "owner" | "member",
        status: (member?.status ?? "pending") as "pending" | "accepted",
      } satisfies BucketSummary;
    }),
    total,
    page: request.pagination.page,
    totalPages: Math.ceil(total / request.pagination.pageSize) || 1,
  };
}

// ponytail: the bucket list itself ignores the date/user filters (all member
// buckets always show); only the per-bucket expense totals respect them.
function buildExpenseMatch(
  userId: string,
  filters: BucketSearchRequest["filterCriteria"],
): Record<string, unknown> {
  const match: Record<string, unknown> = {};
  if (filters.owner) {
    applyOwnerFilter(match, "userId", { userId }, filters.owner);
  }
  applyDateFilter(match, "paidAt", filters.date);
  return match;
}

// ponytail: ExpenseModel/UserModel reads above are stats/read-models only
// (expense existence, filtered totals, member display names) — writes stay
// on BucketModel, so this repository owns no cross-model invariants.
// Named exports are kept for category/auth/user/expense services (out of
// scope); bucket.service uses the default object, matching expense.repository.
const bucketRepository = {
  listBucketsForMember,
  isMember,
  listBucketsForPendingMember,
  findBucketById,
  createBucket,
  updateBucketName,
  deleteBucket,
  addBucketMember,
  acceptBucketMember,
  pullBucketMember,
  expenseExistsInBucket,
  getFilteredBucketExpenseStats,
  findUsersByIds,
  findBucketByUserId,
  listOwnerPendingRequests,
  searchBuckets,
};

export default bucketRepository;
