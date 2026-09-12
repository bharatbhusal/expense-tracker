"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/modals/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { bucketsApi } from "@/lib/api/buckets";
import { useAppDispatch } from "@/store/hooks";
import { revokeInvite } from "@/store/slices/bucketSlice";
import { bucketErrorMessage } from "../bucket-form";
import type { BucketMemberWithName, BucketSummary } from "@/constants/types/bucket.types";

export function BucketMembersDialog({
  bucket,
  open,
  onClose,
}: {
  bucket: BucketSummary;
  open: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [members, setMembers] = useState<BucketMemberWithName[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [revoking, setRevoking] = useState<BucketMemberWithName | null>(null);
  const [pending, setPending] = useState(false);

  const loadMembers = async () => {
    if (!bucket._id) return;
    setMembersLoading(true);
    try {
      const detail = await bucketsApi.getBucketStats(bucket._id);
      setMembers(detail.members);
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to load members"));
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRevoke = async (member: BucketMemberWithName) => {
    if (!bucket._id) return;
    setPending(true);
    try {
      await dispatch(revokeInvite({ id: bucket._id, userId: member.userId })).unwrap();
      toast.success(`Removed ${member.name || member.username || "member"}`);
      setRevoking(null);
      await loadMembers();
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to remove member"));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`${bucket.name} members`}
        subtitle="Manage access"
        description="Revoke pending invites or remove members."
      >
        {/* ponytail: fetch on mount of the dialog instead of a parent callback — one mount, one fetch. */}
        <MembersBody
          loading={membersLoading}
          members={members}
          pending={pending}
          onLoad={() => void loadMembers()}
          onRemove={setRevoking}
        />
      </Modal>

      <ConfirmDialog
        open={revoking !== null}
        title="Remove member"
        subtitle="Revoke access"
        description={`Remove ${revoking?.name || revoking?.username || "this member"}? They will lose access to "${bucket.name}".`}
        onConfirm={() => {
          if (revoking) void handleRevoke(revoking);
        }}
        onCancel={() => setRevoking(null)}
      />
    </>
  );
}

function MembersBody({
  loading,
  members,
  pending,
  onLoad,
  onRemove,
}: {
  loading: boolean;
  members: BucketMemberWithName[];
  pending: boolean;
  onLoad: () => void;
  onRemove: (m: BucketMemberWithName) => void;
}) {
  // ponytail: load once when the dialog body first renders.
  useEffect(() => {
    onLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const others = members.filter((m) => m.role !== "owner");
  if (others.length === 0) {
    return <p className="text-sm text-[var(--color-muted)]">No other members yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {others.map((member) => (
        <li
          key={member.userId}
          className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={member.name}>
              {member.name}
            </p>
            <p className="truncate text-xs text-[var(--color-muted)]">
              {member.status === "pending" ? "Pending invitation" : "Member"}
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => onRemove(member)}>
            Remove
          </Button>
        </li>
      ))}
    </ul>
  );
}
