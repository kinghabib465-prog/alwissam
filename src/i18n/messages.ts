export type Locale = "ar" | "fr" | "en";

export const LOCALES: Locale[] = ["ar", "fr", "en"];
export const LOCALE_COOKIE = "alwisam_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "ar" || value === "fr" || value === "en";
}

export function localeDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function localeHtmlLang(locale: Locale): string {
  if (locale === "fr") return "fr";
  if (locale === "en") return "en";
  return "ar-DZ-u-nu-latn";
}

export type PublicMessages = {
  brand: string;
  navHome: string;
  navServices: string;
  navFaq: string;
  navContact: string;
  patientLogin: string;
  register: string;
  staffLogin: string;
  quickLinks: string;
  contactUs: string;
  openMap: string;
  contactPageMap: string;
  footerAbout: string;
  rights: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  contactTitle: string;
  mapMissing: string;
  language: string;
};

export const publicMessages: Record<Locale, PublicMessages> = {
  ar: {
    brand: "عيادة الوسام لطب الأسنان",
    navHome: "الرئيسية",
    navServices: "الخدمات",
    navFaq: "الأسئلة",
    navContact: "تواصل معنا",
    patientLogin: "دخول المريض",
    register: "تسجيل",
    staffLogin: "دخول الطاقم الطبي",
    quickLinks: "روابط سريعة",
    contactUs: "تواصل معنا",
    openMap: "فتح الموقع على Google Maps",
    contactPageMap: "صفحة تواصل معنا والخريطة",
    footerAbout:
      "رعاية أسنان متخصصة بفريق طبي محترف وتقنيات حديثة لابتسامة صحية تدوم.",
    rights: "جميع الحقوق محفوظة",
    heroTitle: "ابتسامتك تستحق الأفضل",
    heroSubtitle: "سجّل عند الوصول وانتظر توجيه السكرتارية للطبيب المناسب.",
    heroCta: "سجّل الآن",
    contactTitle: "تواصل معنا",
    mapMissing: "لم تُضف الخريطة بعد — من الإعدادات ← تواصل معنا",
    language: "اللغة",
  },
  fr: {
    brand: "Clinique dentaire El Wissam",
    navHome: "Accueil",
    navServices: "Services",
    navFaq: "FAQ",
    navContact: "Contactez-nous",
    patientLogin: "Espace patient",
    register: "S'enregistrer",
    staffLogin: "Accès personnel",
    quickLinks: "Liens rapides",
    contactUs: "Contactez-nous",
    openMap: "Ouvrir sur Google Maps",
    contactPageMap: "Page contact et carte",
    footerAbout:
      "Soins dentaires spécialisés avec une équipe professionnelle et des techniques modernes.",
    rights: "Tous droits réservés",
    heroTitle: "Votre sourire mérite le meilleur",
    heroSubtitle:
      "Enregistrez-vous à l'arrivée et attendez l'orientation de la secrétaire.",
    heroCta: "S'enregistrer",
    contactTitle: "Contactez-nous",
    mapMissing: "Carte non configurée — Paramètres → Contactez-nous",
    language: "Langue",
  },
  en: {
    brand: "El Wissam Dental Clinic",
    navHome: "Home",
    navServices: "Services",
    navFaq: "FAQ",
    navContact: "Contact us",
    patientLogin: "Patient login",
    register: "Check in",
    staffLogin: "Staff login",
    quickLinks: "Quick links",
    contactUs: "Contact us",
    openMap: "Open on Google Maps",
    contactPageMap: "Contact page and map",
    footerAbout:
      "Specialized dental care with a professional team and modern techniques.",
    rights: "All rights reserved",
    heroTitle: "Your smile deserves the best",
    heroSubtitle:
      "Check in on arrival and wait for the secretary to guide you to the right doctor.",
    heroCta: "Check in now",
    contactTitle: "Contact us",
    mapMissing: "Map not set yet — Settings → Contact us",
    language: "Language",
  },
};
