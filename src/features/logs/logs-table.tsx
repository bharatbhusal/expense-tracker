"use client";

import Link from "next/link";
import { FiChevronLeft, FiChevronRight, FiArrowUp, FiArrowDown } from "react-icons/fi";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/datetime";
import { useAppSelector } from "@/store/hooks";
import { LogCard } from "@/features/logs/components/log-card";
import type { AuditLogItem } from "@/lib/api/audit";

export type SortField = "timestamp" | "action" | "entity";

type LogsTableProps = {
  items: AuditLogItem[];
  isLoading?: boolean;
  sortBy?: SortField;
  order?: "asc" | "desc";
  onSort?: (field: SortField) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
};

export function LogsTable({
  items,
  isLoading,
  sortBy,
  order,
  onSort,
  page,
  totalPages,
  onPageChange,
  emptyMessage = "No logs found",
}: LogsTableProps) {
  const locale = useAppSelector((s) => s.ui.locale);
  const timezone = useAppSelector((s) => s.ui.timezone);

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field || !order) return null;
    return order === "asc" ? (
      <FiArrowUp className="ml-1 inline h-3 w-3" aria-hidden="true" />
    ) : (
      <FiArrowDown className="ml-1 inline h-3 w-3" aria-hidden="true" />
    );
  };

  const renderSortHead = (field: SortField, label: string) => {
    const sorted = sortBy === field && order;
    return (
      <TableHead aria-sort={sorted ? (order === "asc" ? "ascending" : "descending") : "none"}>
        {onSort ? (
          <button
            type="button"
            onClick={() => onSort(field)}
            className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {label}
            {renderSortIcon(field)}
          </button>
        ) : (
          label
        )}
      </TableHead>
    );
  };

  const renderEmpty = () => (
    <div className="py-8 text-center text-sm text-[var(--color-muted)]" role="status">
      <p>{emptyMessage}</p>
      <Link href="/dashboard" className="mt-1 inline-block underline underline-offset-2">
        View dashboard
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile: card layout */}
      <div className="space-y-2 md:hidden" aria-live="polite" aria-busy={!!isLoading}>
        {isLoading
          ? [...Array(5)].map((_, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-2xl border border-[var(--color-border)] p-3"
              >
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-5 w-16 self-center" />
              </div>
            ))
          : items.length === 0
            ? renderEmpty()
            : items.map((log) => <LogCard key={log._id} log={log} />)}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block" aria-busy={!!isLoading}>
        <Table>
          <TableHeader>
            <TableRow>
              {renderSortHead("action", "Action")}
              {renderSortHead("entity", "Entity")}
              <TableHead>Actor</TableHead>
              <TableHead>Bucket</TableHead>
              {renderSortHead("timestamp", "Time")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>{renderEmpty()}</TableCell>
              </TableRow>
            ) : (
              items.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="font-medium capitalize">{log.action}</TableCell>
                  <TableCell className="capitalize text-[var(--color-muted)]">
                    {log.entity}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--color-muted)]">
                    {log.actorUsername ? `@${log.actorUsername}` : (log.actorName ?? "—")}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--color-muted)]">
                    {log.bucketName ? (
                      <>
                        {log.bucketIcon ?? "📁"} {log.bucketName}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-[var(--color-muted)]">
                    {formatDateTime(log.timestamp, locale, timezone)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {page !== undefined && totalPages !== undefined && totalPages > 1 && onPageChange && (
        <nav
          aria-label="Logs pagination"
          className="mt-3 flex items-center justify-between gap-3 whitespace-nowrap text-sm"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <FiChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-[var(--color-muted)]" aria-live="polite">
            {page} / {totalPages}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            <FiChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </>
  );
}
