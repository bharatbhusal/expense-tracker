"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modals/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { shareLink } from "@/lib/share";
import { useAppDispatch } from "@/store/hooks";
import { inviteUser } from "@/store/slices/bucketSlice";
import { bucketErrorMessage } from "../bucket-form";
import type { BucketSummary } from "@/constants/types/bucket.types";

export function BucketInviteDialog({
  bucket,
  open,
  onClose,
}: {
  bucket: BucketSummary;
  open: boolean;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const [inviteUsername, setInviteUsername] = useState("");
  const [pending, setPending] = useState(false);

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/buckets/${bucket._id}/invite`;
    return shareLink({ url, title: bucket.name });
  };

  const handleInvite = async () => {
    if (!bucket._id) return;
    const username = inviteUsername.trim();
    if (!username) return;
    setPending(true);
    try {
      await dispatch(inviteUser({ id: bucket._id, username })).unwrap();
      toast.success(`Invited ${username}`);
      onClose();
      setInviteUsername("");
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to invite user"));
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Invite to ${bucket.name}`}
      subtitle="Add a collaborator"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void handleCopyInviteLink()}
          >
            Share invitation link
          </Button>
          <p className="text-center text-xs text-[var(--color-muted)]">
            Anyone with this link can request to join. You approve requests in Settings → Buckets.
          </p>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[var(--color-surface)] px-2 text-xs text-[var(--color-muted)]">
              or
            </span>
          </div>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleInvite();
          }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--color-foreground)]">
              Request by Username
            </label>
            <Input
              value={inviteUsername}
              onChange={(e) => setInviteUsername(e.target.value)}
              placeholder="username"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !inviteUsername.trim()}>
              {pending ? <Spinner className="mr-2" /> : null}
              Invite
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
