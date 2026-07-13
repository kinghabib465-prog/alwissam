import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const patientId = String(form.get("patientId") || "");
  const title = String(form.get("title") || "مستند طبي");
  const category = String(form.get("category") || "GENERAL");

  if (!(file instanceof File) || !patientId) {
    return NextResponse.json({ error: "ملف أو مريض غير صالح" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "نوع الملف غير مسموح" }, { status: 400 });
  }

  const maxMb = Number(process.env.MAX_UPLOAD_SIZE_MB || 20);
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: "حجم الملف كبير جدًا" }, { status: 400 });
  }

  const uploadDir = process.env.UPLOAD_DIR || "./uploads";
  await mkdir(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const storedName = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
  const storagePath = path.join(uploadDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  const doc = await prisma.medicalDocument.create({
    data: {
      patientId,
      uploadedById: user.id,
      title,
      category,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath,
    },
  });

  await createAuditLog({
    userId: user.id,
    roleCode: user.role.code,
    action: "FILE_UPLOAD",
    entityType: "MedicalDocument",
    entityId: doc.id,
    newValue: { fileName: file.name, patientId, category },
  });

  return NextResponse.json({ ok: true, document: doc });
}
