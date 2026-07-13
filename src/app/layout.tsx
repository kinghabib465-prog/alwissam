import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { ForceLatinDigits } from "@/components/system/ForceLatinDigits";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar-DZ-u-nu-latn"
      dir="rtl"
      className={`${cairo.variable} ${inter.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <ForceLatinDigits />
        {children}
      </body>
    </html>
  );
}
