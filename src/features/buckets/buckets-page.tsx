"use client";

import { useEffect } from "react";

import { FilterBar } from "@/components/filters";
import { BucketsList } from "@/features/buckets/components/buckets-list";
import { IncomingRequestsSection } from "@/features/buckets/components/incoming-requests-section";
import { InvitationsSection } from "@/features/buckets/components/invitations-section";

import { useAppDispatch } from "@/store/hooks";
import { fetchAllBuckets } from "@/store/slices/bucketSlice";

export function BucketsPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchAllBuckets());
  }, [dispatch]);

  return (
    <div className="space-y-2">
      <FilterBar variant="buckets" />
      <BucketsList />
      <InvitationsSection />
      <IncomingRequestsSection />
    </div>
  );
}
