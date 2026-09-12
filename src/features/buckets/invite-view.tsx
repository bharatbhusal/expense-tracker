"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmojiBadge } from "@/components/ui/emoji-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { bucketsApi } from "@/lib/api/buckets";
import { ApiClientError } from "@/lib/api/client";
import type { BucketPreview } from "@/constants/types/bucket.types";

export function InviteView({ id }: { id: string }) {
  const [preview, setPreview] = useState<BucketPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bucketsApi
      .getPreview(id)
      .then((data) => {
        if (!cancelled) {
          setPreview(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof ApiClientError ? err.message : "Failed to load bucket";
        setError(msg);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await bucketsApi.requestToJoin(id);
      setSuccess(true);
      toast.success("Owner is notified");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "ALREADY_PENDING") {
          setSuccess(true);
          toast.success("Request already pending — owner is notified");
          return;
        }
        if (err.code === "ALREADY_MEMBER") {
          toast.error("You are already a member of this bucket");
          return;
        }
        toast.error(err.message);
      } else {
        toast.error("Failed to send request");
      }
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="mx-auto max-w-lg p-4">
        <Card className="text-center">
          <p className="text-sm font-medium">Could not load bucket</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">{error ?? "Not found"}</p>
          <Link href="/buckets" className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              Back to buckets
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const isOwner = preview.role === "owner" && preview.status === "accepted";
  const isMember = preview.status === "accepted" && !isOwner;
  const isPending = preview.status === "pending";

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4">
      <Card className="flex items-center gap-3">
        <EmojiBadge emoji={preview.icon ?? "📁"} color="var(--color-surface-muted)" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{preview.name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">
            {preview.ownerName ? `Owner: ${preview.ownerName}` : "Shared bucket"} ·{" "}
            {preview.memberCount} {preview.memberCount === 1 ? "member" : "members"}
          </p>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">You were invited to collaborate</h2>
        <p className="text-xs leading-5 text-[var(--color-muted)]">
          This is an invite link for{" "}
          <span className="font-medium text-[var(--color-text)]">{preview.name}</span>. Tap{" "}
          <span className="font-medium text-[var(--color-text)]">Request to join</span> to notify
          the owner. They will see your request under{" "}
          <span className="font-medium">Settings → Buckets → Join Requests</span> and can accept or
          decline.
        </p>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--color-muted)]">
          <li>
            <span className="font-medium text-[var(--color-text)]">Invite by username</span> still
            works — the owner can invite you directly from the bucket menu.
          </li>
          <li>
            <span className="font-medium text-[var(--color-text)]">Invite by link</span> — this
            page. Nothing happens until you click the button below.
          </li>
          <li>
            Once accepted, the bucket appears in your buckets list and you can add/view expenses.
          </li>
        </ul>

        {isOwner && (
          <p className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs">
            You are the owner of this bucket.
          </p>
        )}
        {isMember && (
          <p className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs">
            You are already a member —{" "}
            <Link href={`/buckets/${preview._id}`} className="underline">
              open bucket
            </Link>
            .
          </p>
        )}
        {isPending && !success && (
          <p className="rounded-lg bg-[var(--color-surface-muted)] px-3 py-2 text-xs">
            Request already pending — the owner has been notified.
          </p>
        )}
        {success && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
            Owner is notified. You will gain access once they accept. Check{" "}
            <Link href="/buckets" className="underline">
              your buckets
            </Link>{" "}
            later.
          </p>
        )}

        {!isOwner && !isMember && (
          <Button
            onClick={handleRequest}
            disabled={requesting || success || isPending}
            className="w-full"
          >
            {requesting ? <Spinner className="mr-2" /> : null}
            {success || isPending ? "Request sent" : "Request to join"}
          </Button>
        )}

        <div className="flex gap-2">
          <Link href="/buckets" className="flex-1">
            <Button variant="outline" className="w-full">
              Back to buckets
            </Button>
          </Link>
          {!isOwner && preview.status === "accepted" && (
            <Link href={`/buckets/${preview._id}`} className="flex-1">
              <Button variant="ghost" className="w-full">
                Open bucket
              </Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
