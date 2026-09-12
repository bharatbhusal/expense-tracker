"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Card, CardTitle } from "@/components/ui/card";
import { ConfirmDialog, Modal } from "@/components/modals/dialog";
import { CardMenu } from "@/components/ui/card-menu";
import { EmojiBadge } from "@/components/ui/emoji-badge";
import { formatCurrency } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { deleteBucket, leaveBucket } from "@/store/slices/bucketSlice";
import { BucketForm, bucketErrorMessage } from "../bucket-form";
import { BucketInviteDialog } from "./bucket-invite-dialog";
import { BucketMembersDialog } from "./bucket-members-dialog";
import type { BucketSummary } from "@/constants/types/bucket.types";

type BucketCardProps = {
  bucket: BucketSummary;
  onDelete?: () => void;
  onLeave?: () => void;
};

export function BucketCard({ bucket, onDelete, onLeave }: BucketCardProps) {
  const dispatch = useAppDispatch();
  const currency = useAppSelector((s) => s.ui.currency);

  const isOwner = bucket.role === "owner";
  const isPersonal = Boolean(bucket.isPersonal);

  const [renaming, setRenaming] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [managing, setManaging] = useState(false);

  const handleDelete = async () => {
    if (!bucket._id) return;
    try {
      await dispatch(deleteBucket(bucket._id)).unwrap();
      toast.success("Bucket deleted");
      setDeleting(false);
      onDelete?.();
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to delete bucket"));
    }
  };

  const handleLeave = async () => {
    if (!bucket._id) return;
    try {
      await dispatch(leaveBucket(bucket._id)).unwrap();
      toast.success(`Left ${bucket.name}`);
      setLeaving(false);
      onLeave?.();
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to leave bucket"));
    }
  };

  const handleMenu = (value: string) => {
    if (value === "members") setManaging(true);
    else if (value === "invite") setInviting(true);
    else if (value === "edit") setRenaming(true);
    else if (value === "leave") setLeaving(true);
    else if (value === "delete") setDeleting(true);
  };

  const menuOptions = [
    { value: "members", label: "View Members" },
    ...(isOwner && !isPersonal
      ? [
          { value: "invite", label: "Invite" },
          { value: "edit", label: "Edit" },
          { value: "delete", label: "Delete" },
        ]
      : []),
    ...(!isOwner && !isPersonal ? [{ value: "leave", label: "Leave" }] : []),
  ];

  return (
    <>
      <Card>
        <Link href={`/buckets/${bucket._id}`}>
          <div className="flex gap-2 items-center">
            <EmojiBadge emoji={bucket.icon} color="var(--color-surface-muted)" />
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate" title={bucket.name}>
                {bucket.name}
              </CardTitle>
              <p className="text-xs text-[var(--color-muted)] truncate">
                {bucket.memberCount} {bucket.memberCount === 1 ? "member" : "members"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-semibold tabular-nums">
                {formatCurrency(bucket.totalAmount ?? 0, currency)}
              </p>
              <p className="text-xs text-[var(--color-muted)] tabular-nums">
                {bucket.expenseCount ?? 0}{" "}
                {(bucket.expenseCount ?? 0) === 1 ? "expense" : "expenses"}
              </p>
            </div>
            <CardMenu options={menuOptions} onSelect={handleMenu} label="Bucket actions" />
          </div>
        </Link>
      </Card>

      <Modal
        open={renaming}
        onClose={() => setRenaming(false)}
        title="Rename Bucket"
        subtitle="Update details"
        description="Update this bucket's name and icon."
      >
        <BucketForm
          bucket={bucket}
          onSuccess={() => setRenaming(false)}
          onCancel={() => setRenaming(false)}
        />
      </Modal>

      {isOwner && !isPersonal && (
        <BucketInviteDialog bucket={bucket} open={inviting} onClose={() => setInviting(false)} />
      )}

      <BucketMembersDialog bucket={bucket} open={managing} onClose={() => setManaging(false)} />

      <ConfirmDialog
        open={deleting}
        title="Delete bucket"
        subtitle="Permanent action"
        description={`Delete "${bucket.name}"? All shared data will be lost. This cannot be undone.`}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(false)}
      />

      <ConfirmDialog
        open={leaving}
        title="Leave bucket"
        subtitle="Revoke access"
        description={`Leave "${bucket.name}"? You will lose access to its expenses.`}
        onConfirm={() => void handleLeave()}
        onCancel={() => setLeaving(false)}
      />
    </>
  );
}
