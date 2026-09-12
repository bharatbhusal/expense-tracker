import type { CloudinaryTransform } from "@/constants/types/upload.types";

export function buildCloudinaryUrl(
  publicId: string,
  cloudName: string,
  transform: CloudinaryTransform = {},
): string {
  if (!cloudName) {
    return "";
  }

  const clauses = [
    transform.width ? `w_${transform.width}` : undefined,
    transform.height ? `h_${transform.height}` : undefined,
    transform.crop ? `c_${transform.crop}` : undefined,
    transform.quality ? `q_${transform.quality}` : "q_auto",
    transform.format ? `f_${transform.format}` : "f_auto",
  ].filter(Boolean);

  const transforms = clauses.length > 0 ? `${clauses.join(",")}/` : "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}${publicId}`;
}
