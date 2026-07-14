import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { put } from "@vercel/blob";

function isEphemeralHost() {
  return !!(
    process.env.VERCEL ||
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RENDER ||
    process.env.FLY_APP_NAME
  );
}

export type StoredFile = {
  storagePath: string;
  publicUrl?: string;
};

/**
 * محلي/Docker: قرص محلي عبر UPLOAD_DIR.
 * منصات الرفع: Vercel Blob عند وجود BLOB_READ_WRITE_TOKEN.
 */
export async function storeUploadedFile(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<StoredFile> {
  const ext = path.extname(params.fileName) || ".bin";
  const storedName = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`medical/${storedName}`, params.buffer, {
      access: "private",
      contentType: params.mimeType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { storagePath: blob.url, publicUrl: blob.url };
  }

  if (isEphemeralHost()) {
    throw new Error(
      "رفع الملفات على منصة الاستضافة يتطلب BLOB_READ_WRITE_TOKEN (Vercel Blob) لأن القرص غير دائم.",
    );
  }

  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  await mkdir(uploadDir, { recursive: true });
  const storagePath = path.join(uploadDir, storedName);
  await writeFile(storagePath, params.buffer);
  return { storagePath };
}
