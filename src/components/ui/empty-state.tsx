"use client";

import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </Card>
  );
}
