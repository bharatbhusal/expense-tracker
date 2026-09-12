"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FilterBar, useScopedOptions } from "@/components/filters";
import { sortForVariant } from "@/components/filters/variants";
import { LogsTable } from "@/features/logs/logs-table";
import type { SortField } from "@/features/logs/logs-table";
import { auditApi } from "@/lib/api/audit";
import type { AuditLogItem } from "@/lib/api/audit";
import { auditCriteria } from "@/lib/filters";
import { fetchAllBuckets } from "@/store/slices/bucketSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPage, setSort } from "@/store/slices/filtersSlice";

export default function LogsPage() {
  const dispatch = useAppDispatch();
  const [result, setResult] = useState<{
    key: string | null;
    items: AuditLogItem[];
    totalPages: number;
  }>({ key: null, items: [], totalPages: 0 });
  const [error, setError] = useState<string | null>(null);

  const { filterCriteria, sortCriteria, pagination } = useAppSelector((s) => s.filters.logs);
  const buckets = useAppSelector((s) => s.buckets.allBuckets);

  const { owners } = useScopedOptions(true, buckets, filterCriteria.bucket);

  useEffect(() => {
    dispatch(fetchAllBuckets());
  }, [dispatch]);

  const requestKey = JSON.stringify({
    filterCriteria,
    sortCriteria,
    pagination,
  });

  const effectiveSort = useMemo(() => sortForVariant("logs", sortCriteria), [sortCriteria]);

  useEffect(() => {
    let cancelled = false;
    auditApi
      .searchLogs({
        filterCriteria: auditCriteria(filterCriteria, "logs"),
        sortCriteria: effectiveSort,
        pagination,
      })
      .then((res) => {
        if (cancelled) return;
        setError(null);
        setResult({ key: requestKey, items: res.items, totalPages: res.totalPages });
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ key: requestKey, items: [], totalPages: 0 });
          setError("Failed to load logs");
          toast.error("Failed to load logs");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey, filterCriteria, effectiveSort, pagination]);

  const handleSort = (field: SortField) => {
    dispatch(
      setSort({
        variant: "logs",
        field,
        direction:
          effectiveSort.field === field && effectiveSort.direction === "DESC" ? "ASC" : "DESC",
      }),
    );
  };

  const isLoading = result.key !== requestKey;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base font-semibold tracking-tight">Activity Logs</h3>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-danger)] px-3 py-2 text-xs"
        >
          {error}
        </p>
      )}
      <FilterBar variant="logs" />
      <LogsTable
        items={result.items}
        isLoading={isLoading}
        sortBy={effectiveSort.field as SortField}
        order={effectiveSort.direction === "ASC" ? "asc" : "desc"}
        onSort={handleSort}
        page={pagination.page}
        totalPages={result.totalPages}
        onPageChange={(p) => dispatch(setPage({ variant: "logs", page: p }))}
      />
    </div>
  );
}
