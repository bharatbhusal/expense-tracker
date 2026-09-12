"use client";

import { Card } from "@/components/ui/card";
import { formatShortDateTime } from "@/lib/datetime";
import { useAppSelector } from "@/store/hooks";
import type { AuditLogItem } from "@/lib/api/audit";

type Props = {
  log: AuditLogItem;
};

export function LogCard({ log }: Props) {
  const locale = useAppSelector((s) => s.ui.locale);

  const actor = log.actorUsername ? `@${log.actorUsername}` : log.actorName;
  const bucket = log.bucketName ? `${log.bucketIcon ?? "📁"} ${log.bucketName}` : null;

  return (
    <Card className="border border-[var(--color-border)] p-3">
      <div className="flex gap-2 items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium capitalize leading-5">
            {log.action}
            {log.entity ? (
              <span className="ml-1 capitalize text-[var(--color-muted)]">{log.entity}</span>
            ) : null}
          </p>
          {log.note && <p className="text-xs text-[var(--color-muted)]">{log.note}</p>}
          <p className="text-xs text-[var(--color-muted)]">
            {actor ? `by ${actor}` : ""}
            {bucket ? ` • ${bucket}` : ""}
          </p>
        </div>
        <p className="shrink-0 text-xs text-[var(--color-muted)]">
          {formatShortDateTime(log.timestamp, locale)}
        </p>
      </div>
    </Card>
  );
}
