"use client";

import { useState, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/modals/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/filters";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchCategoriesWithStats, deleteCategory } from "@/store/slices/categorySlice";
import { CategoryCard } from "@/features/categories/components/category-card";
import { AddCategoryDialog } from "@/features/categories/components/add-category-dialog";
import { formatCurrency } from "@/lib/format";
import { categoryCriteria } from "@/lib/filters";
import { sortForVariant } from "@/components/filters/variants";
import { StatCard } from "@/components/stat-card";

export function CategoryManager() {
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filterState = useAppSelector((s) => s.filters.categories);
  const filterCriteria = filterState.filterCriteria;
  const sortCriteria = filterState.sortCriteria;

  const [loadedFor, setLoadedFor] = useState(filterCriteria);
  if (loadedFor !== filterCriteria) {
    setLoadedFor(filterCriteria);
  }

  const currency = useAppSelector((s) => s.ui.currency);
  const categoriesWithStats = useAppSelector((s) => s.categories.itemsWithStats);

  useEffect(() => {
    dispatch(
      fetchCategoriesWithStats({
        filterCriteria: categoryCriteria(filterCriteria, "categories"),
        sortCriteria: sortForVariant("categories", sortCriteria),
      }),
    );
  }, [dispatch, filterCriteria, sortCriteria]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await dispatch(deleteCategory(deletingId)).unwrap();
      toast.success("Category deleted");
      setDeletingId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    }
  };

  const summaryCells: Array<[string, string]> = [
    ["Total", formatCurrency(categoriesWithStats?.stats?.total ?? 0, currency)],
    ["Avg", formatCurrency(categoriesWithStats?.stats?.avg ?? 0, currency)],
    ["Min", formatCurrency(categoriesWithStats?.stats?.min ?? 0, currency)],
    ["Max", formatCurrency(categoriesWithStats?.stats?.max ?? 0, currency)],
    ["Categories", String(categoriesWithStats?.stats?.count ?? 0)],
    ["Expenses", String(categoriesWithStats?.stats?.expenseCount ?? 0)],
  ];

  return (
    <div className="flex gap-2 flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Categories</h1>
        <Button size="sm" onClick={() => setDrawerOpen(true)}>
          <FiPlus className="mr-1.5" /> New Category
        </Button>
      </div>
      <FilterBar variant="categories" />
      <div className="flex flex-wrap gap-2">
        {!categoriesWithStats
          ? Array.from({ length: summaryCells.length }).map((_, i) => (
              <Card key={i} className="min-w-[100px] flex-1">
                <Skeleton className="h-3 w-15 mb-2"></Skeleton>
                <Skeleton className="h-4 w-20"></Skeleton>
              </Card>
            ))
          : summaryCells.map(([label, value]) => (
              <StatCard key={label} title={label} value={value} />
            ))}
      </div>

      {categoriesWithStats?.items?.length === 0 ? (
        <EmptyState title="No categories found" description="Create one to start tracking." />
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {categoriesWithStats?.items?.map((category) => (
            <CategoryCard
              key={category._id}
              category={category}
              onEdit={() => setEditingId(category._id)}
              onDelete={() => setDeletingId(category._id)}
            />
          ))}
        </div>
      )}

      <AddCategoryDialog open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <AddCategoryDialog
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        id={editingId ?? undefined}
      />

      <ConfirmDialog
        open={deletingId !== null}
        title="Delete category"
        subtitle="Permanent action"
        description="This action cannot be undone."
        onCancel={() => setDeletingId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
