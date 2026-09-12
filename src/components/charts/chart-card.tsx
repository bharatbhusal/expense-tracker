"use client";

import { type ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui/card";

type ChartCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <Card className={className}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
      </div>
      {children}
    </Card>
  );
}
