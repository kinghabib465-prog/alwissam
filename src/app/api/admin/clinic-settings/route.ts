import { NextRequest, NextResponse } from "next/server";
import { DayOfWeek } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isClinicOwner } from "@/lib/auth/clinic-owner";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit/log";

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isClinicOwner(user)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }
  if (req.headers.get("x-csrf-token") !== user.csrfToken) {
    return NextResponse.json({ error: "رمز الحماية غير صالح" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const section = String(body.section || "");

  if (section === "clinic_info") {
    const existing = await prisma.clinicSetting.findUnique({
      where: { key: "clinic_info" },
    });
    const prev = (existing?.value || {}) as Record<string, string>;
    const value = {
      ...prev,
      nameAr: String(body.nameAr || "عيادة الوسام لطب الأسنان").trim(),
      phone: String(body.phone || "").trim(),
      email: String(body.email || "").trim(),
      address: String(body.address || "").trim(),
      descriptionAr: String(body.descriptionAr || "").trim(),
    };
    await prisma.clinicSetting.upsert({
      where: { key: "clinic_info" },
      update: { value },
      create: { key: "clinic_info", value },
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "CLINIC_INFO_UPDATED",
      entityType: "ClinicSetting",
      entityId: "clinic_info",
      newValue: value,
      reason: `تحديث وصف العيادة بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === "contact") {
    const existing = await prisma.clinicSetting.findUnique({
      where: { key: "clinic_info" },
    });
    const prev = (existing?.value || {}) as Record<string, string>;
    let mapsEmbedUrl = String(body.mapsEmbedUrl || "").trim();
    // إن لصق المستخدم كود iframe كامل نستخرج src
    const iframeSrc = mapsEmbedUrl.match(/src=["']([^"']+)["']/i);
    if (iframeSrc) mapsEmbedUrl = iframeSrc[1]!;

    const value = {
      ...prev,
      nameAr: String(body.nameAr || prev.nameAr || "عيادة الوسام لطب الأسنان").trim(),
      phone: String(body.phone ?? prev.phone ?? "").trim(),
      email: String(body.email ?? prev.email ?? "").trim(),
      address: String(body.address ?? prev.address ?? "").trim(),
      mapsEmbedUrl,
      mapsLink: String(body.mapsLink || "").trim(),
    };
    await prisma.clinicSetting.upsert({
      where: { key: "clinic_info" },
      update: { value },
      create: { key: "clinic_info", value },
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "CONTACT_UPDATED",
      entityType: "ClinicSetting",
      entityId: "clinic_info",
      newValue: value,
      reason: `تحديث تواصل معنا بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === "doctor_profile") {
    const doctorId = String(body.doctorId || "");
    const specialtyAr = String(body.specialtyAr || "").trim();
    const bioAr = String(body.bioAr || "").trim();
    if (!doctorId || !specialtyAr) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }
    await prisma.doctor.update({
      where: { id: doctorId },
      data: { specialtyAr, bioAr: bioAr || null },
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "DOCTOR_PROFILE_UPDATED",
      entityType: "Doctor",
      entityId: doctorId,
      newValue: { specialtyAr, bioAr },
      reason: `تحديث وصف طبيب بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === "working_hours") {
    const doctorId = String(body.doctorId || "");
    const hours = Array.isArray(body.hours) ? body.hours : [];
    if (!doctorId) {
      return NextResponse.json({ error: "الطبيب مطلوب" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const row of hours) {
        const dayOfWeek = String(row.dayOfWeek) as DayOfWeek;
        const shift = String(row.shift || "DAY");
        const startTime = String(row.startTime || "09:00");
        const endTime = String(row.endTime || "17:00");
        const isActive = !!row.isActive;
        if (!Object.values(DayOfWeek).includes(dayOfWeek)) continue;

        await tx.workingHour.upsert({
          where: {
            doctorId_dayOfWeek_shift: { doctorId, dayOfWeek, shift },
          },
          update: { startTime, endTime, isActive },
          create: { doctorId, dayOfWeek, shift, startTime, endTime, isActive },
        });
      }
    });

    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "WORKING_HOURS_UPDATED",
      entityType: "Doctor",
      entityId: doctorId,
      newValue: { hours: hours as object },
      reason: `تحديث مواعيد العمل بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  if (section === "public_pages") {
    const value = {
      aboutAr: String(body.aboutAr || "").trim(),
      services: Array.isArray(body.services)
        ? body.services.map((s: { name?: string; description?: string }) => ({
            name: String(s?.name || "").trim(),
            description: String(s?.description || "").trim(),
          }))
        : [],
      faqs: Array.isArray(body.faqs)
        ? body.faqs.map((f: { question?: string; answer?: string }) => ({
            question: String(f?.question || "").trim(),
            answer: String(f?.answer || "").trim(),
          }))
        : [],
    };
    await prisma.clinicSetting.upsert({
      where: { key: "public_pages" },
      update: { value },
      create: { key: "public_pages", value },
    });
    await createAuditLog({
      userId: user.id,
      roleCode: user.role.code,
      action: "PUBLIC_PAGES_UPDATED",
      entityType: "ClinicSetting",
      entityId: "public_pages",
      newValue: value,
      reason: `تحديث صفحات الموقع بواسطة ${user.fullName}`,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "قسم غير معروف" }, { status: 400 });
}
