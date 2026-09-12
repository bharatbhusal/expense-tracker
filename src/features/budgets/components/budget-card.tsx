"use client";

import { useState } from "react";

import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/modals/dialog";
import { CardMenu } from "@/components/ui/card-menu";
import { EmojiBadge } from "@/components/ui/emoji-badge";
import { BudgetFormDialog } from "@/features/budgets/budget-form";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { deleteBudget } from "@/store/slices/budgetSlice";
import type { BudgetItem } from "@/constants/types/budget.types";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

const periodLabel: Record<string, string> = {
  weekly: "This week",
  monthly: "This month",
  yearly: "This year",
};

export function BudgetCard({ budget }: { budget: BudgetItem }) {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  const currency = useAppSelector((s) => s.ui.currency);
  const isOwner = authUser?.id === budget.ownerId;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const pct = Math.min(100, budget.pct);
  const over = budget.spent > budget.amount;
  const name = budget.categoryName ?? "Bucket budget";

  const handleMenu = (value: string) => {
    if (value === "edit") setEditOpen(true);
    else if (value === "delete") setDeleteOpen(true);
  };

  const menuOptions = [
    { value: "edit", label: "Edit" },
    { value: "delete", label: "Delete" },
  ];

  return (
    <>
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {budget.categoryName ? (
              <EmojiBadge
                emoji={budget.categoryEmoji}
                color={budget.categoryColor ?? "var(--color-surface-muted)"}
              />
            ) : null}
            <div className="min-w-0">
              <CardTitle className="truncate" title={name}>
                {name}
              </CardTitle>
              <p className="text-xs text-[var(--color-muted)]">
                {periodLabel[budget.period] ?? budget.period}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <p className="text-sm font-semibold whitespace-nowrap">
              {formatCurrency(budget.amount, currency)}
            </p>
            {isOwner && (
              <CardMenu options={menuOptions} onSelect={handleMenu} label="Budget actions" />
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div
            role="status"
            aria-label={over ? `Over budget by ${Math.abs(budget.pct - 100)}%` : undefined}
            className="h-2 rounded-full bg-[var(--color-surface-muted)] overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all ${over ? "bg-[var(--color-danger)]" : "bg-[var(--color-primary)]"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[var(--color-muted)]">
            <span>{formatCurrency(budget.spent, currency)} spent</span>
            <span className={over ? "text-[var(--color-danger)] font-medium" : ""}>
              {over ? (
                <>
                  <span aria-hidden="true">! </span>Over budget · {Math.abs(budget.pct - 100)}% over
                </>
              ) : (
                `${Math.abs(budget.pct - 100)}% left`
              )}
            </span>
          </div>
        </div>
      </Card>

      <BudgetFormDialog open={editOpen} onClose={() => setEditOpen(false)} budget={budget} />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete budget"
        subtitle="Permanent action"
        description="This will permanently delete the budget."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          try {
            await dispatch(deleteBudget(budget._id)).unwrap();
            toast.success("Budget deleted");
            setDeleteOpen(false);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Delete failed");
          }
        }}
      />
    </>
  );
}
