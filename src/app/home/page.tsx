import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Track My Biryani",
  description: "Track daily expenses with analytics and categories.",
};

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 text-center">
      <Image src="/logo_medium.jpeg" alt="" width={80} height={80} className="mb-6 rounded-2xl" />
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Track My Biryani</h1>
      <p className="mb-8 text-sm text-[var(--color-muted)]">
        A simple, powerful expense tracker that helps you understand where your money goes.
        Categorize spending, visualize trends, and stay on top of your finances.
      </p>

      <div className="mb-8 space-y-3 text-left text-sm text-[var(--color-muted)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg">📊</span>
          <span>
            <strong>Dashboard</strong> — See your total spend, top categories, and daily cash flow
            at a glance.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg">🧾</span>
          <span>
            <strong>Expenses</strong> — Log each expense with title, amount, category, location, and
            even photos.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg">🏷️</span>
          <span>
            <strong>Categories</strong> — Create custom categories with emojis and colors to
            organize your spending.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg">📈</span>
          <span>
            <strong>Analytics</strong> — Explore trends, contribution insights, and category
            breakdowns.
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <Link
          href="/auth/signup"
          className="rounded-lg bg-[var(--color-primary)] px-6 py-3 text-center text-sm font-medium text-[var(--color-primary-foreground)] transition-colors hover:brightness-110"
        >
          Get Started
        </Link>
        <Link
          href="/auth/login"
          className="rounded-lg border border-[var(--color-border)] px-6 py-3 text-center text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
