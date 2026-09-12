import { apiRequest } from "@/lib/api/client";
import type {
  BucketDetail,
  BucketPreview,
  BucketSummary,
  IncomingRequestsGroup,
} from "@/constants/types/bucket.types";
import type {
  BucketSearchRequest,
  ExpenseFilterCriteria,
  SearchResult,
} from "@/constants/types/search.types";

export const bucketsApi = {
  searchBuckets: (request: BucketSearchRequest) =>
    apiRequest<SearchResult<BucketSummary>>("/buckets/search", {
      method: "POST",
      body: request,
    }),
  createBucket: (payload: { name: string; icon?: string }) =>
    apiRequest<BucketDetail>("/buckets", {
      method: "POST",
      body: payload,
    }),
  getBucketStats: (id: string, filterCriteria?: ExpenseFilterCriteria) =>
    apiRequest<BucketDetail>(`/buckets/${encodeURIComponent(id)}/stats`, {
      method: "POST",
      body: { filterCriteria },
    }),
  updateBucket: (id: string, payload: { name: string; icon?: string }) =>
    apiRequest<BucketDetail>(`/buckets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    }),
  deleteBucket: (id: string) =>
    apiRequest<{ message: string }>(`/buckets/${encodeURIComponent(id)}`, { method: "DELETE" }),
  inviteUser: (id: string, payload: { username: string }) =>
    apiRequest<BucketDetail>(`/buckets/${encodeURIComponent(id)}/invite`, {
      method: "POST",
      body: payload,
    }),
  acceptInvite: (id: string) =>
    apiRequest<BucketDetail>(`/buckets/${encodeURIComponent(id)}/accept`, { method: "POST" }),
  declineInvite: (id: string) =>
    apiRequest<BucketSummary>(`/buckets/${encodeURIComponent(id)}/decline`, { method: "POST" }),
  leaveBucket: (id: string) =>
    apiRequest<{ message: string }>(`/buckets/${encodeURIComponent(id)}/leave`, { method: "POST" }),
  revokeInvite: (id: string, userId: string) =>
    apiRequest<BucketDetail>(
      `/buckets/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    ),
  getPreview: (id: string) =>
    apiRequest<BucketPreview>(`/buckets/${encodeURIComponent(id)}/preview`, { method: "GET" }),
  requestToJoin: (id: string) =>
    apiRequest<BucketPreview>(`/buckets/${encodeURIComponent(id)}/request`, { method: "POST" }),
  getIncomingRequests: () =>
    apiRequest<IncomingRequestsGroup[]>("/buckets/requests", { method: "GET" }),
  acceptRequest: (id: string, userId: string) =>
    apiRequest<BucketDetail>(
      `/buckets/${encodeURIComponent(id)}/requests/${encodeURIComponent(userId)}/accept`,
      { method: "POST" },
    ),
};
