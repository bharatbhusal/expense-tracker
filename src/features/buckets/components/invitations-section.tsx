"use client";

import { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/modals/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { acceptInvite, declineInvite } from "@/store/slices/bucketSlice";
import { bucketErrorMessage } from "@/features/buckets/bucket-form";

export function InvitationsSection() {
  const dispatch = useAppDispatch();
  const { invitations, loading } = useAppSelector((s) => s.buckets);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);

  const acceptingInvite = invitations.find((i) => i._id === accepting);

  const decliningInvite = invitations.find((i) => i._id === declining);

  const handleAccept = async (id: string) => {
    setPendingId(id);
    try {
      const bucket = await dispatch(acceptInvite(id)).unwrap();
      toast.success(`Joined ${bucket.name}`);
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to accept invitation"));
    } finally {
      setPendingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    setPendingId(id);
    try {
      await dispatch(declineInvite(id)).unwrap();
      toast.success("Invitation declined");
    } catch (err) {
      toast.error(bucketErrorMessage(err, "Failed to decline invitation"));
    } finally {
      setPendingId(null);
    }
  };

  if (!loading && invitations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Invitations</h2>
        <p className="text-xs text-[var(--color-muted)]">Buckets you have been invited to.</p>
      </div>
      {loading && invitations.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : (
        invitations.map((invitation) => (
          <Card
            key={invitation._id ?? "pending"}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invitation.name}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">Invited you to join</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                disabled={pendingId !== null}
                onClick={() => setAccepting(invitation._id!)}
              >
                <FiCheck className="mr-1" />
                Accept
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pendingId !== null}
                onClick={() => setDeclining(invitation._id!)}
              >
                <FiX className="mr-1" />
                Decline
              </Button>
            </div>
          </Card>
        ))
      )}

      <Modal
        open={accepting !== null}
        title="Join bucket"
        subtitle="Accept invitation"
        description={`Join "${acceptingInvite?.name ?? ""}"? You will get access to all the expenses in the bucket posted by the members. You can post your expenses as well.`}
        onClose={() => setAccepting(null)}
      >
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setAccepting(null)}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={pendingId !== null}
            onClick={() => {
              if (accepting) handleAccept(accepting);
            }}
          >
            Join
          </Button>
        </div>
      </Modal>

      <Modal
        open={declining !== null}
        title="Decline invitation"
        subtitle="Reject invitation"
        description={`Decline "${decliningInvite?.name ?? ""}"? You won't be able to view and add expenses in the bucket.`}
        onClose={() => setDeclining(null)}
      >
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setDeclining(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={pendingId !== null}
            onClick={() => {
              if (declining) handleDecline(declining);
            }}
          >
            Decline
          </Button>
        </div>
      </Modal>
    </section>
  );
}
