import { Types } from "mongoose";

import { BUCKET_SORTABLE_FIELDS } from "@/constants/types/search.types";
import type { BucketSearchRequest, ExpenseFilterCriteria } from "@/constants/types/search.types";
import {
  applyCategoryFilter,
  applyDateFilter,
  applyOwnerFilter,
  buildPaging,
  buildSort,
  searchRegex,
  type MongoFilter,
  type MongoSort,
} from "@/lib/query-builders/shared";

export async function buildBucketQuery(
  userId: string,
  request: BucketSearchRequest,
): Promise<{
  query: MongoFilter;
  sort: MongoSort;
  skip: number;
  limit: number;
}> {
  // ponytail: membership list ignores filter.date/filter.owner — those only
  // scope the per-bucket expense totals in the repository layer.
  // pending self-requests (invitedBy === userId) are not "invitations" — they must be
  // approved by owner, not self-accepted. Exclude them from the regular bucket list.
  const uid = new Types.ObjectId(userId);
  const query: MongoFilter = {
    $or: [
      { members: { $elemMatch: { userId: uid, status: "accepted" } } },
      {
        members: {
          $elemMatch: {
            userId: uid,
            status: "pending",
            invitedBy: { $ne: uid },
          },
        },
      },
    ],
  };

  return {
    query,
    sort: buildSort(BUCKET_SORTABLE_FIELDS, request.sortCriteria),
    ...buildPaging(request.pagination),
  };
}

export function buildBucketStatsExpenseMatch(
  userId: string,
  filters: ExpenseFilterCriteria,
): MongoFilter {
  const match: MongoFilter = {};
  applyCategoryFilter(match, filters.category);
  applyOwnerFilter(match, "userId", { userId }, filters.owner);
  applyDateFilter(match, "paidAt", filters.date);
  const and: MongoFilter[] = [];
  const regex = searchRegex(filters.q);
  if (regex) {
    and.push({ $or: [{ title: regex }, { notes: regex }] });
  }
  if (filters.hasNotes !== undefined) {
    and.push(
      filters.hasNotes
        ? { notes: { $exists: true, $nin: ["", null] } }
        : { $or: [{ notes: { $exists: false } }, { notes: { $in: ["", null] } }] },
    );
  }
  if (filters.hasLocation !== undefined) {
    and.push(
      filters.hasLocation
        ? {
            $or: [
              { "location.latitude": { $exists: true, $ne: 0 } },
              { "location.longitude": { $exists: true, $ne: 0 } },
            ],
          }
        : {
            $or: [
              { "location.latitude": { $exists: false } },
              { "location.latitude": 0, "location.longitude": 0 },
            ],
          },
    );
  }
  if (and.length > 0) match.$and = and;
  return match;
}
