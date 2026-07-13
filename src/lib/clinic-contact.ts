import { prisma } from "@/lib/db/prisma";

export type ClinicContactInfo = {
  nameAr: string;
  phone: string;
  email: string;
  address: string;
  mapsEmbedUrl: string;
  mapsLink: string;
  descriptionAr?: string;
};

export async function loadClinicContact(): Promise<ClinicContactInfo> {
  try {
    const row = await prisma.clinicSetting.findUnique({
      where: { key: "clinic_info" },
    });
    const v = (row?.value || {}) as Partial<ClinicContactInfo>;
    return {
      nameAr: v.nameAr || "عيادة الوسام لطب الأسنان",
      phone: v.phone || process.env.CLINIC_PHONE || "",
      email: v.email || process.env.CLINIC_EMAIL || "",
      address: v.address || process.env.CLINIC_ADDRESS || "",
      mapsEmbedUrl: v.mapsEmbedUrl || process.env.CLINIC_MAP_EMBED_URL || "",
      mapsLink: v.mapsLink || "",
      descriptionAr: v.descriptionAr || "",
    };
  } catch {
    return {
      nameAr: "عيادة الوسام لطب الأسنان",
      phone: process.env.CLINIC_PHONE || "",
      email: process.env.CLINIC_EMAIL || "",
      address: process.env.CLINIC_ADDRESS || "",
      mapsEmbedUrl: process.env.CLINIC_MAP_EMBED_URL || "",
      mapsLink: "",
    };
  }
}
