import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toLatinDigits } from "@/lib/latin-digits";
import { formatClinicDate } from "@/lib/clinic-date";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LATN = { numberingSystem: "latn" as const };

export function formatCurrencyDZD(amount: number | string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${toLatinDigits(
    new Intl.NumberFormat("ar-DZ", LATN).format(value),
  )} د.ج`;
}

export function formatArabicDate(date: Date | string) {
  return formatClinicDate(date);
}

export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return toLatinDigits(
    new Intl.DateTimeFormat("en-GB", {
      ...LATN,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d),
  );
}

export function generateNumber(prefix: string) {
  const now = new Date();
  const stamp = [
    now.getFullYear().toString().slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${stamp}-${rand}`;
}
