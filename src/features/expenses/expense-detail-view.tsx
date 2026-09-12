"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/modals/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import GoogleMap from "@/components/maps/google-map";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { shallowEqual } from "react-redux";
import { toIsoBounds } from "@/lib/date-range";
import { expensesApi } from "@/lib/api/expenses";
import { scopedExpenseRequest } from "@/lib/filters";
import { fetchExpenseDetail, deleteExpense, updateExpense } from "@/store/slices/expenseSlice";
import { fetchAllBuckets } from "@/store/slices/bucketSlice";
import { ExpenseCard } from "@/features/expenses/components/expense-card";
import { ExpenseTable } from "./components/expense-table";
import type { ExpenseItem } from "@/constants/types/expense.types";

type ExpenseDetailViewProps = {
  id: string;
};

export function ExpenseDetailView({ id }: ExpenseDetailViewProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [recentPage, setRecentPage] = useState(1);

  const expense = useAppSelector((s) => s.expenses.currentExpense, shallowEqual);

  const expensesLoading = useAppSelector((s) => s.expenses.loading);
  const [recent, setRecent] = useState<{
    items: ExpenseItem[];
    totalPages: number;
    loading: boolean;
  }>({ items: [], totalPages: 0, loading: true });
  const localRange = useAppSelector((s) => s.ui.dateRange);
  const buckets = useAppSelector((s) => s.buckets.allBuckets);

  useEffect(() => {
    dispatch(fetchExpenseDetail(id))
      .unwrap()
      .catch(() => router.replace("/unauthorized?type=expense"));
  }, [dispatch, id, router]);

  useEffect(() => {
    if (buckets.length === 0) {
      dispatch(fetchAllBuckets());
    }
  }, [dispatch, buckets.length]);

  // ponytail: the recent section follows the shared ui date range — the same
  // filter state every FilterBar-backed view reads.
  const recentBounds = useMemo(() => toIsoBounds(localRange), [localRange]);

  useEffect(() => {
    if (!expense?.categoryId) return;
    const bounds = recentBounds;
    let cancelled = false;
    expensesApi
      .searchExpenses(
        scopedExpenseRequest({
          bucketId: expense.bucketId ?? undefined,
          categoryId: expense.categoryId,
          page: recentPage,
          from: bounds.from,
          to: bounds.to,
        }),
      )
      .then((res) => {
        if (cancelled) return;
        if (res.items.length === 0 && recentPage > 1) {
          setRecentPage(1);
          return;
        }
        setRecent({
          items: res.items,
          totalPages: res.totalPages,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled)
          setRecent({
            items: [],
            totalPages: 0,
            loading: false,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [expense?.categoryId, expense?.bucketId, recentPage, recentBounds]);

  const sharedBuckets = buckets.filter((b) => b.status === "accepted");

  const moveOptions = expense ? sharedBuckets.filter((b) => b._id !== expense.bucketId) : [];

  const handleMove = async () => {
    if (!moveTarget) return;
    setIsMoving(true);
    try {
      await dispatch(
        updateExpense({
          id,
          payload: {
            bucketId: moveTarget,
          },
        }),
      ).unwrap();
      toast.success("Expense moved");
      setMoveOpen(false);
      setMoveTarget(null);
      dispatch(fetchExpenseDetail(id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to move expense");
    } finally {
      setIsMoving(false);
    }
  };

  if (expensesLoading && !expense) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-52" />
        <Card>
          <div className="flex justify-between mb-4">
            <Skeleton className="h-6 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
          </div>
          <Skeleton className="h-14 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-5 w-24 mb-3" />
          <Skeleton className="h-48 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!expense) {
    return <Card>Expense not found</Card>;
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      <ExpenseCard
        expense={expense}
        onEdit={() => router.push(`/expenses/${id}/edit`)}
        onDelete={() => setDeleteOpen(true)}
      />

      {expense.posterName && (
        <p className="px-1 text-xs text-[var(--color-muted)]">Posted by {expense.posterName}</p>
      )}

      {expense.images?.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Glimpses</CardTitle>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {expense.images.map((secureUrl) => (
              <div
                key={secureUrl}
                className="min-w-[220px] snap-center overflow-hidden rounded-lg border border-[var(--color-border)]"
              >
                <div className="relative h-40 w-full">
                  <Image
                    src={secureUrl}
                    alt="Glimpse"
                    fill
                    sizes="(max-width: 640px) 100vw, 400px"
                    className="object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {expense.location &&
        (expense.location.latitude !== 0 || expense.location.longitude !== 0) && (
          <GoogleMap
            latitude={expense.location.latitude}
            longitude={expense.location.longitude}
            address={expense.location.address}
            height={240}
          />
        )}

      <div className="space-y-2">
        <p className="text-sm font-semibold px-1">Recent in Category</p>
        <ExpenseTable
          items={recent.items}
          isLoading={recent.loading}
          page={recentPage}
          totalPages={recent.totalPages}
          onPageChange={setRecentPage}
          emptyMessage="No expenses in this category for the selected range"
        />
      </div>

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Move to bucket"
        subtitle="Transfer expense"
        description="Category resolves from the source expense"
      >
        <div className="space-y-3">
          <Select
            value={moveTarget ?? ""}
            aria-label="Destination bucket"
            onChange={(e) => setMoveTarget(e.target.value)}
          >
            {moveOptions.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setMoveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!moveTarget || isMoving}
              onClick={handleMove}
            >
              {isMoving ? "Moving..." : "Move"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete expense"
        subtitle="Permanent action"
        description="This action cannot be undone."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          try {
            await dispatch(deleteExpense(id)).unwrap();
            toast.success("Expense deleted");
            router.replace("/dashboard");
          } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to delete expense");
          }
        }}
      />
    </div>
  );
}
