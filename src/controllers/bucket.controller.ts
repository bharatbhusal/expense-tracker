import { NextRequest } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import bucketService from "@/services/bucket.service";

// ponytail: create takes (auth.id, body), not full auth — unlike
// expense.createExpense(auth, body), bucket creation needs only the userId.
async function searchBuckets(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json();
  return bucketService.searchBuckets(auth.id, body);
}

async function listBuckets() {
  const auth = await getAuthPayload();
  return bucketService.listBuckets(auth.id);
}

async function createBucket(request: NextRequest) {
  const auth = await getAuthPayload();
  const body = await request.json();
  return bucketService.createBucket(auth.id, body);
}

async function getBucketStats(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  return bucketService.getBucketStats(auth.id, id, body);
}

async function updateBucket(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  const body = await request.json();
  return bucketService.updateBucket(auth.id, id, body);
}

async function deleteBucket(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return bucketService.deleteBucket(auth.id, id);
}

async function inviteUser(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  const body = await request.json();
  return bucketService.inviteUser(auth.id, id, body);
}

async function acceptInvite(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return bucketService.acceptInvite(auth.id, id);
}

async function declineInvite(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return bucketService.declineInvite(auth.id, id);
}

async function leaveBucket(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return bucketService.leaveBucket(auth.id, id);
}

async function revokeInvite(
  _request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  const auth = await getAuthPayload();
  const { id, userId } = await context.params;
  return bucketService.revokeInvite(auth.id, id, userId);
}

async function getBucketPreview(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return bucketService.getBucketPreview(auth.id, id);
}

async function requestToJoin(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await getAuthPayload();
  const { id } = await context.params;
  return bucketService.requestToJoin(auth.id, id);
}

async function listIncomingRequests() {
  const auth = await getAuthPayload();
  return bucketService.listIncomingRequests(auth.id);
}

async function acceptRequest(
  _request: NextRequest,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  const auth = await getAuthPayload();
  const { id, userId } = await context.params;
  return bucketService.acceptRequest(auth.id, id, userId);
}

const bucketController = {
  searchBuckets,
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
};

export default bucketController;
