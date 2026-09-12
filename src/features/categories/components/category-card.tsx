"use client";

import Link from "next/link";
import { FiShare2 } from "react-icons/fi";
import { formatCurrency } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import { EmojiBadge } from "@/components/ui/emoji-badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CardMenu } from "@/components/ui/card-menu";
import { shareLink } from "@/lib/share";
import type { CategoryItem } from "@/constants/types/analytics.types";

type CategoryCardProps = {
  category: CategoryItem;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const currency = useAppSelector((s) => s.ui.currency);
  const currentUserId = useAppSelector((s) => s.auth.user?.id);
  const isOwner = !!currentUserId && category.userId === currentUserId;
  const hasActions = onEdit || onDelete;

  const handleShare = () => {
    const url = `${window.location.origin}/categories/${category._id}`;
    return shareLink({
      url,
      title: category.name,
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

  return (
    <Card>
      <Link href={`/categories/${category._id}`}>
        <div className="flex gap-2 items-center">
          <EmojiBadge emoji={category.emoji} color={category.color} />
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate" title={category.name}>
              {category.name}
            </CardTitle>
            <p className="text-xs text-[var(--color-muted)]">
              {category.stats?.count} expense
              {category.stats?.count !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-semibold">{formatCurrency(category.stats?.total ?? 0, currency)}</p>
          </div>
          {hasActions && (
            <>
              {isOwner ? (
                <CardMenu options={menuOptions} onSelect={handleMenu} label="Category actions" />
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer shrink-0"
                  aria-label="Share category"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleShare();
                  }}
                >
                  <FiShare2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
        {category?.stats?.pct > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-muted)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(category.stats?.pct, 100)}%`,
                  backgroundColor: category.color,
                }}
              />
            </div>
            <span className="text-xs text-[var(--color-muted)] tabular-nums w-10 text-right">
              {category.stats?.pct.toFixed(1)}%
            </span>
          </div>
        )}
        {category.stats?.count >= 2 && (
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
            <div className="flex gap-1 items-center">
              <p className="text-[var(--color-muted)]">Avg:</p>
              <p className="font-medium">{formatCurrency(category.stats?.avg, currency)}</p>
            </div>
            <div className="flex gap-1 items-center">
              <p className="text-[var(--color-muted)]">Min:</p>
              <p className="font-medium">{formatCurrency(category.stats?.min, currency)}</p>
            </div>
            <div className="flex gap-1 items-center">
              <p className="text-[var(--color-muted)]">Max:</p>
              <p className="font-medium">{formatCurrency(category.stats?.max, currency)}</p>
            </div>
          </div>
        )}
      </Link>
    </Card>
  );
}
