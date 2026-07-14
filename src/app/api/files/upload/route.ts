import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";
import { storeUploadedFile } from "@/lib/files/storage";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export const runtime = "nodejs";

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

  const buffer = Buffer.from(await file.arrayBuffer());

  let stored;
  try {
    stored = await storeUploadedFile({
      fileName: file.name,
      mimeType: file.type,
      buffer,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "تعذر حفظ الملف على المنصة";
    return NextResponse.json({ error: message }, { status: 501 });
  }

  const doc = await prisma.medicalDocument.create({
    data: {
      patientId,
      uploadedById: user.id,
      title,
      category,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storagePath: stored.storagePath,
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
