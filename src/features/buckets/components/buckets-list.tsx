"use client";

import { useEffect } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BucketCard } from "@/features/buckets/components/bucket-card";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBuckets } from "@/store/slices/bucketSlice";

// ponytail: the bucket list lives with the buckets feature; the settings
// buckets page composes it with invitations/requests sections.
export function BucketsList() {
  const dispatch = useAppDispatch();
  const { buckets, loading } = useAppSelector((s) => s.buckets);
  const sortCriteria = useAppSelector((s) => s.filters.buckets.sortCriteria);
  const filterCriteria = useAppSelector((s) => s.filters.buckets.filterCriteria);

  useEffect(() => {
    dispatch(fetchBuckets());
  }, [dispatch, sortCriteria, filterCriteria]);

  if (loading && buckets.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <EmptyState title="No buckets yet" description="Create one to start tracking expenses." />
    );
  }

  return (
    <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {buckets.map((bucket) => (
        <BucketCard key={bucket._id} bucket={bucket} />
      ))}
    </section>
  );
}
