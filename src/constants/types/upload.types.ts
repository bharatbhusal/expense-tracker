export type UploadSignaturePayload = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId?: string;
};

export type UploadedAsset = {
  publicId: string;
  bytes: number;
  format: string;
  width: number;
  height: number;
  secureUrl: string;
};

export type CloudinaryTransform = {
  width?: number;
  height?: number;
  crop?: "fill" | "fit" | "scale" | "thumb";
  quality?: number | "auto";
  format?: "auto" | "jpg" | "png" | "webp" | "avif";
};
