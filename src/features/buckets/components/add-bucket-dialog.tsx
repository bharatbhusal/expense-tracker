"use client";

import { Modal } from "@/components/modals/dialog";
import { BucketForm } from "@/features/buckets/bucket-form";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddBucketDialog({ open, onClose }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Bucket"
      subtitle="New shared space"
      description="A shared space to track expenses with others."
    >
      <BucketForm onSuccess={onClose} onCancel={onClose} />
    </Modal>
  );
}
