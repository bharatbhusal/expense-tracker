"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-4 mt-[50%] max-w-xl rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="text-lg font-semibold text-[var(--color-danger)]">Something went wrong</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{error.message}</p>
      <div className="flex gap-4 items-center">
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
