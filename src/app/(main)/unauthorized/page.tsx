import Link from "next/link";

import { Button } from "@/components/ui/button";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const label =
    type === "expense"
      ? "expense"
      : type === "category"
        ? "category"
        : type === "bucket"
          ? "bucket"
          : "item";

  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <h1 className="text-2xl font-semibold">Access denied</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        You don&apos;t have access to this {label}.
      </p>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        It belongs to a shared bucket you are not part of. Ask its owner to add you, or check that
        the link is correct.
      </p>
      <p className="mt-2 text-xs text-[var(--color-muted)]">
        You can still explore your own expenses and categories from the dashboard.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/dashboard">
          <Button className="w-full sm:w-auto">Go to Dashboard</Button>
        </Link>
        <Link href="/expenses/new">
          <Button variant="outline" className="w-full sm:w-auto">
            Add New Expense
          </Button>
        </Link>
      </div>
    </div>
  );
}
