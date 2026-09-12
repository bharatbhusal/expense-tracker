/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiFileText, FiLogOut, FiMoon, FiPieChart, FiSun, FiUsers } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/modals/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { fetchMe, logoutUser } from "@/store/slices/authSlice";

export function MorePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { resolvedTheme, setTheme } = useTheme();

  const authUser = useAppSelector((s) => s.auth.user);
  const authLoading = useAppSelector((s) => s.auth.loading);

  const [mounted, setMounted] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? (resolvedTheme ?? "light") : null;

  return (
    <div className="space-y-2">
      <div className="flex w-full justify-between items-center">
        <h2 className="text-lg font-semibold">
          Hi {(authUser?.name ?? authUser?.username) || "User"}!
        </h2>
        <div className="flex items-center">
          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
            >
              <FiMoon className="dark:hidden" aria-hidden="true" />
              <FiSun className="hidden dark:block" aria-hidden="true" />
            </Button>
          ) : (
            <span className="inline-flex h-9 w-9" aria-hidden="true" />
          )}
          {authLoading ? (
            <Skeleton className="h-6 w-6 rounded-full" />
          ) : authUser ? (
            <Button variant="ghost" size="sm" onClick={() => setLogoutOpen(true)}>
              <FiLogOut className="mr-1.5" aria-hidden="true" />
            </Button>
          ) : (
            <Link href="/auth/login">
              <Button size="sm">Login</Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <Link href="/buckets" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Buckets</p>
            <p className="truncate text-xs text-[var(--color-muted)]">
              Invitations and the buckets you&apos;re part of
            </p>
          </div>

          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-muted)]"
          >
            <FiUsers className="h-4 w-4" />
          </span>
        </Link>
      </Card>
      <Card>
        <Link href="/budgets" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Budgets</p>
            <p className="truncate text-xs text-[var(--color-muted)]">
              Budgets per bucket and category
            </p>
          </div>

          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-muted)]"
          >
            <FiPieChart className="h-4 w-4" />
          </span>
        </Link>
      </Card>
      <Card>
        <Link href="/logs" className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Logs</p>
            <p className="truncate text-xs text-[var(--color-muted)]">View all logged activity</p>
          </div>

          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-[var(--color-muted)]"
          >
            <FiFileText className="h-4 w-4" />
          </span>
        </Link>
      </Card>

      <ConfirmDialog
        open={logoutOpen}
        title="Log out"
        subtitle="End your session"
        description="You will be signed out of your account."
        onCancel={() => setLogoutOpen(false)}
        onConfirm={async () => {
          try {
            await dispatch(logoutUser()).unwrap();
            // ponytail: slices already reset via rootReducerWithReset on auth/logout/fulfilled;
            // persisted storage is overwritten with cleared state — no manual PURGE needed
            toast.success("Logged out");
            router.replace("/auth/login");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Logout failed");
          }
        }}
      />
    </div>
  );
}
