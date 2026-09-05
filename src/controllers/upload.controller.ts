import { NextRequest } from "next/server";

import { getAuthPayload } from "@/lib/auth";
import uploadService from "@/services/upload.service";

async function getSignature(request: NextRequest) {
  const auth = await getAuthPayload();
  const publicId = request.nextUrl.searchParams.get("publicId") ?? undefined;
  return uploadService.getSignature(auth.id, publicId);
}

const uploadController = {
  getSignature,
};

export default uploadController;
