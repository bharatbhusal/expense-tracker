"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FiPlus, FiSave } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { EmojiPickerField } from "@/components/forms/emoji-picker-field";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { createCategory, updateCategory, fetchCategoryDetail } from "@/store/slices/categorySlice";
import { fetchAllBuckets } from "@/store/slices/bucketSlice";
import { personalBucketId } from "@/lib/filters";
import { toIsoBoundsForPreset } from "@/lib/date-range";

function randomColor(): string {
  const random = Math.floor(Math.random() * 0xffffff);
  return `#${random.toString(16).padStart(6, "0")}`;
}

type FormValues = {
  name: string;
  color: string;
  emoji: string;
};

type CategoryFormProps = {
  id?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CategoryForm({ id, onSuccess, onCancel }: CategoryFormProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const buckets = useAppSelector((s) => s.buckets.allBuckets);
  const category = useAppSelector((s) => s.categories.currentCategory);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState("");

  const isEditing = Boolean(id);
  const categoryLoaded = isEditing && category?._id === id;

  useEffect(() => {
    if (buckets.length === 0) {
      dispatch(fetchAllBuckets());
    }
  }, [dispatch, buckets.length]);

  useEffect(() => {
    if (!selectedBucketId && buckets.length > 0) {
      setSelectedBucketId(personalBucketId(buckets));
    }
  }, [selectedBucketId, buckets]);

  useEffect(() => {
    if (isEditing && id) {
      const bounds = toIsoBoundsForPreset("THIS_YEAR", undefined, undefined);
      dispatch(
        fetchCategoryDetail({
          id,
          from: bounds?.from ?? "",
          to: bounds?.to ?? "",
        }),
      );
    }
  }, [dispatch, isEditing, id]);

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      name: "",
      color: randomColor(),
      emoji: "🏷️",
    },
  });

  const emojiValue = watch("emoji");

  useEffect(() => {
    if (isEditing) {
      const loaded = category && category._id === id ? category : null;
      if (loaded) {
        reset({
          name: loaded.name,
          color: loaded.color ?? randomColor(),
          emoji: loaded.emoji ?? "🏷️",
        });
        setSelectedBucketId(loaded.bucketId ?? "");
      }
    } else {
      reset({
        name: "",
        color: randomColor(),
        emoji: "🏷️",
      });
    }
  }, [category, id, reset, isEditing]);

  const onSubmit = async (values: FormValues) => {
    if (!selectedBucketId) {
      toast.error("Bucket is required");
      return;
    }
    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await dispatch(
          updateCategory({
            id,
            payload: {
              name: values.name.trim(),
              emoji: values.emoji || "🏷️",
              color: values.color,
              bucketId: selectedBucketId,
            },
          }),
        ).unwrap();
        toast.success("Category updated");
        if (onSuccess) {
          onSuccess();
        } else {
          router.replace(`/categories/${id}`);
        }
      } else {
        await dispatch(
          createCategory({
            name: values.name.trim(),
            emoji: values.emoji || "🏷️",
            color: values.color,
            bucketId: selectedBucketId,
          }),
        ).unwrap();
        toast.success("Category created");
        onSuccess?.();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Failed to update category"
            : "Failed to create category",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else if (id) router.replace(`/categories/${id}`);
  };

  if (isEditing && !categoryLoaded) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">Bucket</label>
        <Select value={selectedBucketId} onChange={(e) => setSelectedBucketId(e.target.value)}>
          <option value="">Select a bucket</option>
          {buckets.map((bucket) => (
            <option key={bucket._id} value={bucket._id}>
              {bucket.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">Name</label>
        <Input {...register("name")} placeholder="Food, Transport..." autoFocus={!isEditing} />
      </div>

      <div className="flex gap-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Emoji</label>
          <EmojiPickerField
            value={emojiValue}
            onChange={(emoji) => setValue("emoji", emoji)}
            label="Pick category emoji"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Color</label>

          <input
            type="color"
            {...register("color")}
            className="flex h-10 w-10 overflow-hidden items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-lg hover:bg-[var(--color-surface-muted)] transition-colors"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2" />
              Saving...
            </>
          ) : isEditing ? (
            <>
              <FiSave className="mr-1.5 h-4 w-4" />
              Save
            </>
          ) : (
            <>
              <FiPlus className="mr-1.5 h-4 w-4" />
              Add
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
