"use client";

import { useState } from "react";
import { FiDownload, FiPlus, FiRefreshCw, FiX } from "react-icons/fi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/modals/dialog";
import { Label } from "@/components/ui/label";
import { uploadsApi } from "@/lib/api/uploads";
import { buildUploadPublicId } from "@/lib/naming";
import {
  compressImageIfNeeded,
  uploadImageToCloudinary,
  validateUploadFile,
} from "@/lib/uploads/client";

type UploadingItem = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "failed";
};

type GlimpsesUploadProps = {
  value: string[];
  onChange: (value: string[]) => void;
  expenseTitle?: string;
};

function getExtension(url: string): string {
  const match = url.match(/\.(\w+)(?:\?.*)?$/);
  return match?.[1] ?? "jpg";
}

export function GlimpsesUpload({ value, onChange, expenseTitle = "expense" }: GlimpsesUploadProps) {
  const [uploading, setUploading] = useState<UploadingItem[]>([]);
  const [clickedImage, setClickedImage] = useState<string | null>(null);

  const hasPending = uploading.some((item) => item.status === "uploading");

  const handleUpload = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (value.length + fileList.length > 5) {
      toast.error("You can upload up to 5 glimpses per expense.");
      return;
    }

    const validationError = fileList.map(validateUploadFile).find(Boolean);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const newUrls: string[] = [];
    const queue = fileList.map((file) => ({ id: crypto.randomUUID(), file }));
    setUploading((current) => [
      ...current,
      ...queue.map(({ id, file }) => ({ id, file, progress: 0, status: "uploading" as const })),
    ]);

    // ponytail: concurrency-2 worker pool — bounded parallelism without a queue lib.
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const item = queue[next];
        next += 1;
        try {
          const preparedFile = await compressImageIfNeeded(item.file);
          const publicId = buildUploadPublicId(expenseTitle || "expense");
          const signature = await uploadsApi.getSignature(publicId);

          const uploaded = await uploadImageToCloudinary(preparedFile, signature, (progress) => {
            setUploading((current) =>
              current.map((each) => (each.id === item.id ? { ...each, progress } : each)),
            );
          });

          newUrls.push(uploaded.secureUrl);
          setUploading((current) => current.filter((each) => each.id !== item.id));
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Upload failed");
          setUploading((current) =>
            current.map((each) => (each.id === item.id ? { ...each, status: "failed" } : each)),
          );
        }
      }
    };

    await Promise.all([worker(), worker()]);

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
    }
  };

  const retryUpload = async (id: string) => {
    const failed = uploading.find((item) => item.id === id);
    if (!failed) return;

    setUploading((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "uploading", progress: 0 } : item,
      ),
    );
    await handleUpload([failed.file]);
    setUploading((current) => current.filter((item) => item.id !== id));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    void handleUpload(e.target.files);
    e.target.value = "";
  };

  const downloadImage = (url: string, index: number) => {
    const ext = getExtension(url);
    const filename = `${expenseTitle.replace(/\s+/g, "_")}_image_${index}.${ext}`;
    // ponytail: cross-origin `download` is ignored by browsers (Cloudinary URL),
    // so fall back to a new tab — same click still downloads same-origin.
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <div className="space-y-3">
      <Label>Glimpses</Label>
      <div className="flex gap-2 overflow-x-auto">
        {value.map((url) => (
          <div
            key={url}
            className="relative shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="Glimpse preview"
              className="h-28 w-28 cursor-pointer object-cover"
              loading="lazy"
              tabIndex={0}
              role="button"
              aria-label="View full image"
              onClick={() => setClickedImage(url)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setClickedImage(url);
                }
              }}
            />
            <button
              type="button"
              aria-label="Remove image"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
              onClick={() => onChange(value.filter((each) => each !== url))}
            >
              <FiX className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        ))}
        {value.length < 5 && (
          <label className="flex h-28 w-28 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors focus-within:border-[var(--color-primary)] focus-within:text-[var(--color-primary)]">
            <FiPlus className="h-6 w-6" aria-hidden="true" />
            <span className="sr-only">Add glimpses (up to 5 images)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={handleFileInput}
            />
          </label>
        )}
      </div>

      {uploading.length > 0 && (
        <ul className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {uploading.map((item) => (
            <li key={item.id} className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="max-w-[80%] truncate">{item.file.name}</span>
                {item.status === "failed" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto p-1 text-[var(--color-danger)]"
                    onClick={() => void retryUpload(item.id)}
                  >
                    <FiRefreshCw /> Retry
                  </Button>
                ) : (
                  <span className="text-[var(--color-muted)]">{item.progress}%</span>
                )}
              </div>
              <div className="h-1.5 rounded bg-[var(--color-border)]">
                <div
                  className={`h-1.5 rounded ${
                    item.status === "failed"
                      ? "bg-[var(--color-danger)]"
                      : "bg-[var(--color-primary)]"
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasPending && <p className="text-xs text-[var(--color-muted)]">Uploads in progress...</p>}

      <Modal
        open={!!clickedImage}
        title="Image"
        subtitle="Full image preview"
        description="Click download to save a copy."
        onClose={() => setClickedImage(null)}
        className="sm:max-w-3xl"
      >
        {clickedImage && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={clickedImage}
              alt="Full size"
              className="max-h-[80vh] w-full rounded-lg object-contain"
            />
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadImage(clickedImage, value.indexOf(clickedImage))}
              >
                <FiDownload className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
