import { env } from "@/config/env";
import { createUploadSignature } from "@/lib/cloudinary";

// ponytail: no repository layer — signature creation is a stateless crypto
// call (lib/cloudinary), not a DB read, so there is nothing to persist.
async function getSignature(_userId: string, publicId?: string) {
  return createUploadSignature(env.CLOUDINARY_FOLDER_NAME, publicId);
}

const uploadService = {
  getSignature,
};

export default uploadService;
