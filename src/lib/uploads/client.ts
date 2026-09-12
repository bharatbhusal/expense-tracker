import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_FILE_SIZE_BYTES } from "@/lib/uploads/constants";
import type { UploadedAsset, UploadSignaturePayload } from "@/constants/types/upload.types";

export function validateUploadFile(file: File): string | null {
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type)) {
    return "Unsupported file type. Please upload JPEG, PNG, WEBP, or HEIC image.";
  }

  return null;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image"));
    };
    image.src = url;
  });
}

export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_FILE_SIZE_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");

  if (!context) {
    return file;
  }

  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) {
    return file;
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function uploadImageToCloudinary(
  file: File,
  signature: UploadSignaturePayload,
  onProgress?: (progress: number) => void,
): Promise<UploadedAsset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);
  if (signature.publicId) {
    formData.append("public_id", signature.publicId);
  }

  const response = await new Promise<UploadedAsset>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onerror = () => reject(new Error("Upload failed due to network error"));
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        const details = xhr.responseText ? `: ${xhr.responseText}` : "";
        reject(new Error(`Upload failed with status ${xhr.status}${details}`));
        return;
      }

      const payload = JSON.parse(xhr.responseText) as {
        public_id: string;
        bytes: number;
        format: string;
        width: number;
        height: number;
        secure_url: string;
      };

      resolve({
        publicId: payload.public_id,
        bytes: payload.bytes,
        format: payload.format,
        width: payload.width,
        height: payload.height,
        secureUrl: payload.secure_url,
      });
    };

    xhr.send(formData);
  });

  return response;
}
