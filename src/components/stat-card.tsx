import { Card } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string;
};

export function StatCard({ title, value }: StatCardProps) {
  return (
    <Card key={title} className="min-w-[140px] flex-1">
      <dl>
        <dt className="text-xs text-[var(--color-muted)]">{title}</dt>
        <dd className="font-medium break-words tabular-nums">{value}</dd>
      </dl>
    </Card>
  );
}
