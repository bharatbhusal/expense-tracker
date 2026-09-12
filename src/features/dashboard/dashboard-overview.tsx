"use client";

import { Suspense, useMemo, useEffect } from "react";
import Link from "next/link";

import { FilterBar, sortForVariant } from "@/components/filters";
import { ExpenseOverview } from "@/features/expenses/expense-overview";
import { SpendingBarChart } from "@/components/charts/spending-bar-chart";
import { ChartSkeleton } from "@/components/charts/chart-skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpenseTable } from "@/features/expenses/components/expense-table";
import type { SortField } from "@/features/expenses/components/expense-table";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchOverviewStats, fetchChartData, fetchExpenses } from "@/store/slices/expenseSlice";
import { fetchAllBuckets } from "@/store/slices/bucketSlice";
import { setSort, setPage } from "@/store/slices/filtersSlice";
import { getChartLabel } from "@/lib/format";
import { chartGranularity } from "@/lib/filters";

export function DashboardOverview() {
  const dispatch = useAppDispatch();

  const filterCriteria = useAppSelector((s) => s.filters.expenses.filterCriteria);
  const sortCriteria = useAppSelector((s) => s.filters.expenses.sortCriteria);
  const pagination = useAppSelector((s) => s.filters.expenses.pagination);

  const overviewStats = useAppSelector((s) => s.expenses.overviewStats);
  const chartData = useAppSelector((s) => s.expenses.chartData);
  const items = useAppSelector((s) => s.expenses.items);
  const totalPages = useAppSelector((s) => s.expenses.totalPages);
  const isLoading = useAppSelector((s) => s.expenses.loading);

  useEffect(() => {
    dispatch(fetchAllBuckets());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchOverviewStats());
  }, [dispatch, filterCriteria]);

  useEffect(() => {
    dispatch(fetchChartData());
  }, [dispatch, filterCriteria]);

  useEffect(() => {
    dispatch(fetchExpenses());
  }, [dispatch, filterCriteria, sortCriteria, pagination]);

  const averageSpend = useMemo(
    () => overviewStats?.find((card) => card.key !== "total_spend")?.value,
    [overviewStats],
  );

  const effectiveSort = sortForVariant("expenses", sortCriteria);

  const handleSort = (field: SortField) => {
    dispatch(
      setSort({
        variant: "expenses",
        field,
        direction:
          effectiveSort.field === field && effectiveSort.direction === "DESC" ? "ASC" : "DESC",
      }),
    );
  };

  // ponytail: per-section holes instead of one isLoading for everything.
  const overviewLoading = isLoading && !overviewStats;
  const chartLoading = isLoading && !chartData;
  const tableLoading = isLoading && items.length === 0;
  const isEmpty = !isLoading && (chartData?.series?.length ?? 0) === 0 && items.length === 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <FilterBar variant="expenses" />

      <section aria-busy={overviewLoading}>
        <Suspense fallback={<ChartSkeleton />}>
          <ExpenseOverview data={overviewStats} isLoading={overviewLoading} />
        </Suspense>
      </section>

      {isEmpty ? (
        <Card className="py-8 text-center">
          <p className="font-medium">No expenses match these filters</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {overviewStats?.length
              ? `${overviewStats.length} summary stats below — or add your first expense.`
              : "Add your first expense to see trends."}
          </p>
          <Link href="/expenses/new" className="mt-4 inline-block">
            <Button>Add expense</Button>
          </Link>
        </Card>
      ) : (
        <section aria-busy={chartLoading}>
          <Suspense fallback={<ChartSkeleton />}>
            <SpendingBarChart
              stackedSeries={chartData?.series ?? []}
              chartLabel={getChartLabel(chartGranularity(filterCriteria.date), "Expense")}
              averageSpend={averageSpend}
              categoryColorMap={chartData?.categoryColors ?? {}}
              isLoading={chartLoading}
            />
          </Suspense>
        </section>
      )}

      <section aria-busy={tableLoading}>
        <Suspense fallback={<ChartSkeleton />}>
          <ExpenseTable
            items={items}
            isLoading={tableLoading}
            sortBy={effectiveSort.field as SortField}
            order={effectiveSort.direction === "ASC" ? "asc" : "desc"}
            onSort={handleSort}
            page={pagination.page}
            totalPages={totalPages}
            onPageChange={(p) => dispatch(setPage({ variant: "expenses", page: p }))}
            isSection={effectiveSort.field === "paidAt"}
          />
        </Suspense>
      </section>
    </div>
  );
}
