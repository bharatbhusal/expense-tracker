import { apiRequest } from "@/lib/api/client";
import type { UploadSignaturePayload } from "@/constants/types/upload.types";

export const uploadsApi = {
  getSignature: (publicId?: string) =>
    apiRequest<UploadSignaturePayload>(
      `/uploads/signature${publicId ? `?publicId=${encodeURIComponent(publicId)}` : ""}`,
    ),
};
