"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/i18n/messages";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  }

  return (
    <label className="inline-flex items-center gap-1 text-xs text-muted">
      <span className="sr-only">Language</span>
      <select
        className="rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-medium text-navy"
        value={locale}
        onChange={(e) => change(e.target.value as Locale)}
        aria-label="Language"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
