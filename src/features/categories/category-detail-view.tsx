"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/modals/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar, sortForVariant } from "@/components/filters";
import { ExpenseTable } from "@/features/expenses/components/expense-table";
import { AddCategoryDialog } from "@/features/categories/components/add-category-dialog";
import { CategoryCard } from "@/features/categories/components/category-card";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchCategoryDetail, deleteCategory } from "@/store/slices/categorySlice";
import { resolveDateRange } from "@/lib/date-range";
import { expensesApi } from "@/lib/api/expenses";
import { filterBounds, scopedExpenseRequest, expenseCriteriaForVariant } from "@/lib/filters";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import type { ExpenseItem } from "@/constants/types/expense.types";
import type { ExpenseFilterCriteria } from "@/constants/types/search.types";

export function CategoryDetailView({ id }: { id: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filterCriteria = useAppSelector((s) => s.filters.category.filterCriteria);
  const sortCriteria = useAppSelector((s) => s.filters.category.sortCriteria);

  const category = useAppSelector((s) => s.categories.currentCategory);
  const effectiveSort = useMemo(() => sortForVariant("category", sortCriteria), [sortCriteria]);
  const [expenseList, setExpenseList] = useState<{
    items: ExpenseItem[];
    totalPages: number;
    loading: boolean;
  }>({ items: [], totalPages: 0, loading: true });
  const { items: expenses, totalPages: expensesTotalPages, loading: expensesLoading } = expenseList;

  const bounds = useMemo(
    () => filterBounds(resolveDateRange(filterCriteria.date)),
    [filterCriteria.date],
  );

  const filterKey = JSON.stringify([filterCriteria, sortCriteria]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  useEffect(() => {
    dispatch(
      fetchCategoryDetail({
        id,
        from: bounds.from,
        to: bounds.to,
      }),
    )
      .unwrap()
      .catch(() => router.replace("/unauthorized?type=category"));
  }, [dispatch, id, bounds.from, bounds.to, router]);

  useEffect(() => {
    let cancelled = false;
    // category variant filters apply to expenses in that category — bucket/category locked to this id, but other criteria (search/owner/additional/date) from variant
    const variantCriteria = expenseCriteriaForVariant(
      "category",
      filterCriteria as unknown as ExpenseFilterCriteria,
    );
    const scoped = scopedExpenseRequest({
      bucketId: category?.bucketId,
      categoryId: id,
      page,
      from: bounds.from,
      to: bounds.to,
    });
    // merge variant filters (search, owner, additional) onto scoped request, keeping category/bucket locked
    const mergedCriteria = {
      ...scoped.filterCriteria,
      ...Object.fromEntries(
        Object.entries(variantCriteria).filter(
          ([k]) => !["bucket", "category", "date"].includes(k),
        ),
      ),
    } as typeof scoped.filterCriteria;
    expensesApi
      .searchExpenses({
        filterCriteria: mergedCriteria,
        sortCriteria: effectiveSort,
        pagination: { page, pageSize: 20 },
      })
      .then((res) => {
        if (cancelled) return;
        setExpenseList({
          items: res.items,
          totalPages: res.totalPages,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled)
          setExpenseList({
            items: [],
            totalPages: 0,
            loading: false,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [
    id,
    page,
    bounds.from,
    bounds.to,
    sortCriteria,
    effectiveSort,
    category?.bucketId,
    filterCriteria,
  ]);

  const chartTrend = useMemo(() => {
    const raw = category?.trend ?? [];
    if (raw.length === 0) return [];
    const isDaily = raw[0].name.length === 10;
    return raw.map((point) => {
      const parts = point.name.split("-");
      const date = isDaily
        ? new Date(+parts[0], +parts[1] - 1, +parts[2])
        : new Date(+parts[0], +parts[1] - 1);
      return {
        name: new Intl.DateTimeFormat("en-IN", {
          month: "short",
          ...(isDaily ? { day: "2-digit" } : { year: "2-digit" }),
        }).format(date),
        total: point.total,
      };
    });
  }, [category?.trend]);

  const chartStackedSeries = useMemo(
    () =>
      chartTrend.map((point) => ({
        name: point.name,
        [category?.name ?? "Category"]: point.total,
      })),
    [chartTrend, category?.name],
  );

  const chartColorMap = useMemo(
    () => new Map([[category?.name ?? "Category", category?.color ?? "var(--chart-2)"]]),
    [category?.name, category?.color],
  );

  if (!category) {
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
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Skeleton className="h-4 w-32 mb-3" />
          <ChartSkeleton />
        </Card>
        <Card>
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-x-hidden">
      <FilterBar variant="category" />
      <CategoryCard
        category={category}
        onEdit={() => setEditDrawerOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />
      <CashFlowChart
        title="Trend"
        stackedSeries={chartStackedSeries}
        categoryColorMap={chartColorMap}
        isLoading={expensesLoading}
      />

      <ExpenseTable
        items={expenses}
        isLoading={expensesLoading}
        emptyMessage="No expenses in this category"
        page={page}
        totalPages={expensesTotalPages}
        onPageChange={setPage}
        isSection={effectiveSort.field === "paidAt"}
      />

      <AddCategoryDialog
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        id={category?._id}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete category"
        subtitle="Permanent action"
        description="This action cannot be undone."
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          try {
            await dispatch(deleteCategory(id)).unwrap();
            toast.success("Category deleted");
            router.replace("/categories");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete category");
          }
        }}
      />
    </div>
  );
}
