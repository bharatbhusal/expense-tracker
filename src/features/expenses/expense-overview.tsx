"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/stat-card";
import { formatCurrency } from "@/lib/format";
import { useAppSelector } from "@/store/hooks";
import type { DashboardCard } from "@/constants/types/analytics.types";

type ExpenseOverviewProps = {
  data: DashboardCard[] | null;
  isLoading: boolean;
};

const currencyKeys = new Set([
  "total_spend",
  "spend_per_day",
  "spend_per_month",
  "avg_amount",
  "min_amount",
  "max_amount",
]);

export function ExpenseOverview({ data, isLoading }: ExpenseOverviewProps) {
  const currency = useAppSelector((s) => s.ui.currency);

  return (
    <div>
      {isLoading || !data ? (
        <div className="flex flex-wrap gap-2">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="min-w-[100px] flex-1">
              <Skeleton className="h-3 w-15 mb-2"></Skeleton>
              <Skeleton className="h-4 w-20"></Skeleton>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.map((card: DashboardCard) => (
            <div key={card.key} className="flex-1">
              <StatCard
                title={card.title}
                value={
                  currencyKeys.has(card.key)
                    ? formatCurrency(card.value, currency)
                    : String(Math.round(card.value))
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
