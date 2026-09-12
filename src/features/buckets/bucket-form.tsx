"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiEdit2, FiPlus } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmojiPickerField } from "@/components/forms/emoji-picker-field";
import { useAppDispatch } from "@/store/hooks";
import { createBucket, updateBucket } from "@/store/slices/bucketSlice";
import type { BucketSummary } from "@/constants/types/bucket.types";

export function bucketErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: unknown }).message ?? fallback);
  }
  return fallback;
}

type FormValues = {
  name: string;
  icon: string;
};

type BucketFormProps = {
  bucket?: BucketSummary | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function BucketForm({ bucket, onSuccess, onCancel }: BucketFormProps) {
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(bucket);

  const { register, handleSubmit, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      name: bucket?.name ?? "",
      icon: bucket?.icon ?? "📁",
    },
  });

  const iconValue = watch("icon");

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && bucket?._id) {
        await dispatch(
          updateBucket({
            id: bucket._id,
            name: values.name.trim(),
            icon: values.icon || "📁",
          }),
        ).unwrap();
        toast.success("Bucket renamed");
      } else {
        await dispatch(
          createBucket({
            name: values.name.trim(),
            icon: values.icon || "📁",
          }),
        ).unwrap();
        toast.success(`Bucket "${values.name.trim()}" created`);
      }
      onSuccess?.();
    } catch (err) {
      toast.error(
        bucketErrorMessage(err, isEditing ? "Failed to rename bucket" : "Failed to create bucket"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">Name</label>
        <Input {...register("name")} placeholder="Weekend trip" autoFocus={!isEditing} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">Icon</label>
        <EmojiPickerField
          value={iconValue}
          onChange={(emoji) => setValue("icon", emoji)}
          fallback="📁"
          label="Pick bucket icon"
        />
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className={onCancel ? "flex-1" : "w-full"} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2" />
              {isEditing ? "Saving..." : "Creating..."}
            </>
          ) : isEditing ? (
            <>
              <FiEdit2 className="mr-1.5 h-4 w-4" />
              Save
            </>
          ) : (
            <>
              <FiPlus className="mr-1.5 h-4 w-4" />
              Create
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
