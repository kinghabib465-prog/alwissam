import { prisma } from "@/lib/db/prisma";
import { CLINIC_MAPS_PLACE_URL } from "@/lib/clinic-maps";
import { normalizeMapsFields } from "@/lib/maps-url";

export type ClinicContactInfo = {
  nameAr: string;
  phone: string;
  email: string;
  address: string;
  mapsEmbedUrl: string;
  mapsLink: string;
  descriptionAr?: string;
};

const defaultMaps = normalizeMapsFields({
  mapsLink: CLINIC_MAPS_PLACE_URL,
  mapsEmbedUrl: CLINIC_MAPS_PLACE_URL,
});

export async function loadClinicContact(): Promise<ClinicContactInfo> {
  try {
    const row = await prisma.clinicSetting.findUnique({
      where: { key: "clinic_info" },
    });
    const v = (row?.value || {}) as Partial<ClinicContactInfo>;
    const maps = normalizeMapsFields({
      mapsEmbedUrl: v.mapsEmbedUrl || process.env.CLINIC_MAP_EMBED_URL || defaultMaps.mapsEmbedUrl,
      mapsLink: v.mapsLink || defaultMaps.mapsLink,
    });
    return {
      nameAr: v.nameAr || "عيادة الوسام لطب الأسنان",
      phone: v.phone || process.env.CLINIC_PHONE || "",
      email: v.email || process.env.CLINIC_EMAIL || "",
      address: v.address || process.env.CLINIC_ADDRESS || "",
      mapsEmbedUrl: maps.mapsEmbedUrl,
      mapsLink: maps.mapsLink,
      descriptionAr: v.descriptionAr || "",
    };
  } catch {
    return {
      nameAr: "عيادة الوسام لطب الأسنان",
      phone: process.env.CLINIC_PHONE || "",
      email: process.env.CLINIC_EMAIL || "",
      address: process.env.CLINIC_ADDRESS || "",
      mapsEmbedUrl: defaultMaps.mapsEmbedUrl,
      mapsLink: defaultMaps.mapsLink,
    };
  }
}
