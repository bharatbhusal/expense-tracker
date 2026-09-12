"use client";

import Link from "next/link";
import type { ExpenseItem } from "@/constants/types/expense.types";
import { FiMoreVertical, FiShare2 } from "react-icons/fi";
import { formatCurrency } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { EmojiBadge } from "@/components/ui/emoji-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownList } from "@/components/ui/dropdown-list";
import { formatShortDateTime } from "@/lib/datetime";
import { shareLink } from "@/lib/share";
import { CardMenu } from "@/components/ui/card-menu";

type Props = {
  expense: ExpenseItem;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function ExpenseCard({ expense, onEdit, onDelete }: Props) {
  const currency = useAppSelector((s) => s.ui.currency);
  const currentUserId = useAppSelector((s) => s.auth.user?.id);
  const isOwner = !!currentUserId && expense.userId === currentUserId;
  const hasActions = onEdit || onDelete;

  const handleShare = () => {
    const url = `${window.location.origin}/expenses/${expense._id}`;
    return shareLink({
      url,
      title: expense.title || "Expense",
    });
  };

  const handleMenu = (value: string) => {
    if (value === "edit") onEdit?.();
    else if (value === "delete") onDelete?.();
    else if (value === "share") void handleShare();
  };

  const menuOptions = [
    { value: "share", label: "Share" },
    ...(onEdit ? [{ value: "edit", label: "Edit" }] : []),
    ...(onDelete ? [{ value: "delete", label: "Delete" }] : []),
  ];

  const body = (
    <div className="flex gap-2 items-center justify-between">
      <div className="flex gap-2 items-center text-medium min-w-0 flex-1">
        <div className="shrink-0">
          <EmojiBadge
            color={expense?.categoryColor || ""}
            emoji={expense?.categoryEmoji}
            className="flex-1"
          />
        </div>

        <div className="flex flex-col min-w-0">
          <p className="font-medium break-words leading-5">
            {expense.title
              ? expense.title.charAt(0).toUpperCase() + expense.title.slice(1)
              : expense.title}
          </p>
          <p className="text-xs text-[var(--color-muted)]">{formatShortDateTime(expense.paidAt)}</p>
          {expense.posterName && (
            <p className="text-xs text-[var(--color-muted)]">by {expense.posterName}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 items-center shrink-0">
        <div className="text-right shrink-0">
          <p className="font-semibold">{formatCurrency(expense.amount, currency)}</p>
        </div>
        {hasActions && (
          <>
            {isOwner ? (
              <CardMenu options={menuOptions} onSelect={handleMenu} label="Expense actions" />
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer shrink-0"
                aria-label="Share expense"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleShare();
                }}
              >
                <FiShare2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <Card
      className={`block rounded-md border border-[var(--color-border)] p-3 ${!hasActions ? "hover:bg-[color-mix(in_oklab,var(--color-bg)_96%,transparent)]" : ""}`}
    >
      {!hasActions ? (
        <Link
          href={`/expenses/${expense._id}`}
          className="block cursor-pointer"
          aria-label={`View expense ${expense.title || ""}`.trim()}
        >
          {body}
        </Link>
      ) : (
        <div>
          {body}
          {expense.notes && (
            <p className="text-sm border-t-2 mt-4 py-2 text-[var(--color-muted)]">
              {expense.notes}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
