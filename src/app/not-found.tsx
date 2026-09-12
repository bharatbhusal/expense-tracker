import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto mt-20 max-w-md text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        The page you are looking for does not exist.
      </p>
      <Link href="/dashboard" className="mt-4 inline-block">
        <Button>Go to Dashboard</Button>
      </Link>
    </div>
  );
}
