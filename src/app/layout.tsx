import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { ForceLatinDigits } from "@/components/system/ForceLatinDigits";
import { getRequestLocale } from "@/i18n/get-locale";
import { localeDir, localeHtmlLang } from "@/i18n/messages";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "عيادة الوسام لطب الأسنان",
    template: "%s | عيادة الوسام لطب الأسنان",
  },
  description:
    "منصة إدارة عيادة الوسام لطب الأسنان — مواعيد، ملفات طبية، تقويم، جراحة ومدفوعات",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const dir = localeDir(locale);
  const lang = localeHtmlLang(locale);

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${cairo.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <ForceLatinDigits />
        {children}
      </body>
    </html>
  );
}
