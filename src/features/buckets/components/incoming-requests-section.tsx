"use client";

import { useEffect, useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/modals/dialog";
import { EmojiBadge } from "@/components/ui/emoji-badge";
import { bucketErrorMessage } from "@/features/buckets/bucket-form";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  acceptIncomingRequest,
  declineIncomingRequest,
  fetchIncomingRequests,
} from "@/store/slices/bucketSlice";

type ConfirmRequest = {
  bucketId: string;
  userId: string;
  bucketName: string;
  userName: string;
};

export function IncomingRequestsSection() {
  const dispatch = useAppDispatch();
  const { incomingRequests } = useAppSelector((s) => s.buckets);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<ConfirmRequest | null>(null);
  const [declining, setDeclining] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    dispatch(fetchIncomingRequests());
  }, [dispatch]);

  if (incomingRequests.length === 0) return null;

  const handleAccept = async (bucketId: string, userId: string, name: string) => {
    const key = `${bucketId}:${userId}`;
    setPendingKey(key);
    try {
      await dispatch(acceptIncomingRequest({ id: bucketId, userId })).unwrap();
      toast.success(`Approved ${name}`);
      setAccepting(null);
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to accept request"));
    } finally {
      setPendingKey(null);
    }
  };

  const handleDecline = async (bucketId: string, userId: string, name: string) => {
    const key = `${bucketId}:${userId}`;
    setPendingKey(key);
    try {
      await dispatch(declineIncomingRequest({ id: bucketId, userId })).unwrap();
      toast.success(`Declined ${name}`);
      setDeclining(null);
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to decline request"));
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Join Requests</h2>
        <p className="text-xs text-[var(--color-muted)]">
          People who requested to join your buckets. Approve or decline.
        </p>
      </div>

      {incomingRequests.map((group) => (
        <Card key={group.bucketId} className="space-y-2 py-3">
          <div className="flex items-center gap-2">
            <EmojiBadge emoji={group.icon ?? "📁"} color="var(--color-surface-muted)" />
            <p className="truncate text-sm font-medium">{group.name}</p>
            <span className="text-xs text-[var(--color-muted)]">
              {group.requests.length} {group.requests.length === 1 ? "request" : "requests"}
            </span>
          </div>
          <ul className="space-y-2">
            {group.requests.map((req) => {
              const key = `${group.bucketId}:${req.userId}`;
              const pending = pendingKey === key;
              return (
                <li
                  key={req.userId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {req.name || req.username || "User"}
                    </p>
                    <p className="truncate text-xs text-[var(--color-muted)]">
                      {req.username ? `@${req.username}` : "Requested to join"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      disabled={pendingKey !== null}
                      onClick={() =>
                        setAccepting({
                          bucketId: group.bucketId,
                          userId: req.userId,
                          bucketName: group.name,
                          userName: req.name || req.username || "user",
                        })
                      }
                    >
                      {pending ? null : <FiCheck className="mr-1" />}
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pendingKey !== null}
                      onClick={() =>
                        setDeclining({
                          bucketId: group.bucketId,
                          userId: req.userId,
                          bucketName: group.name,
                          userName: req.name || req.username || "user",
                        })
                      }
                    >
                      <FiX className="mr-1" />
                      Decline
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}

      <ConfirmDialog
        open={accepting !== null}
        title="Accept request"
        subtitle="Approve join request"
        description={
          accepting
            ? `Allow ${accepting.userName} to join "${accepting.bucketName}"? They will get access to the bucket.`
            : ""
        }
        onConfirm={() => {
          if (accepting)
            void handleAccept(accepting.bucketId, accepting.userId, accepting.userName);
        }}
        onCancel={() => setAccepting(null)}
      />

      <ConfirmDialog
        open={declining !== null}
        title="Decline request"
        subtitle="Reject join request"
        description={
          declining
            ? `Decline ${declining.userName}'s request to join "${declining.bucketName}"? They will need to request again.`
            : ""
        }
        onConfirm={() => {
          if (declining)
            void handleDecline(declining.bucketId, declining.userId, declining.userName);
        }}
        onCancel={() => setDeclining(null)}
      />
    </section>
  );
}
