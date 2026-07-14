import { prisma } from "@/lib/db/prisma";

export type PublicFaqItem = { question: string; answer: string };
export type PublicServiceItem = { name: string; description: string };

export type PublicPagesContent = {
  aboutAr: string;
  services: PublicServiceItem[];
  faqs: PublicFaqItem[];
};

export const DEFAULT_PUBLIC_PAGES: PublicPagesContent = {
  aboutAr:
    "عيادة الوسام لطب الأسنان تقدم رعاية شاملة تجمع بين العلاج العام، التقويم، الجراحة والتركيبات، مع متابعة دقيقة لكل مريض.",
  services: [
    { name: "فحص عام", description: "معاينة وتشخيص أولي" },
    { name: "تنظيف الأسنان", description: "إزالة الترسبات وتلميع" },
    { name: "حشو", description: "علاج التسوس بالحشو" },
    { name: "تقويم الأسنان", description: "استشارة ومتابعة تقويم" },
    { name: "جراحة", description: "استشارات وعمليات جراحية" },
  ],
  faqs: [
    {
      question: "كيف أسجّل عند الوصول؟",
      answer: "من الصفحة الرئيسية عبّئ الاسم وسبب الزيارة. السكرتارية توجّهك.",
    },
    {
      question: "هل أحتاج حسابًا للزيارة؟",
      answer:
        "لا. الحساب يُفعّل لمرضى العلاج طويل الأمد بعد موافقة الطبيب.",
    },
  ],
};

export async function loadPublicPagesContent(): Promise<PublicPagesContent> {
  try {
    const row = await prisma.clinicSetting.findUnique({
      where: { key: "public_pages" },
    });
    const value = (row?.value || {}) as Partial<PublicPagesContent>;
    return {
      aboutAr:
        typeof value.aboutAr === "string" && value.aboutAr.trim()
          ? value.aboutAr
          : DEFAULT_PUBLIC_PAGES.aboutAr,
      services: Array.isArray(value.services) && value.services.length
        ? value.services.map((s) => ({
            name: String(s?.name || "").trim(),
            description: String(s?.description || "").trim(),
          })).filter((s) => s.name)
        : DEFAULT_PUBLIC_PAGES.services,
      faqs: Array.isArray(value.faqs) && value.faqs.length
        ? value.faqs.map((f) => ({
            question: String(f?.question || "").trim(),
            answer: String(f?.answer || "").trim(),
          })).filter((f) => f.question && f.answer)
        : DEFAULT_PUBLIC_PAGES.faqs,
    };
  } catch {
    return DEFAULT_PUBLIC_PAGES;
  }
}
