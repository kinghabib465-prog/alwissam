import { cookies } from "next/headers";
import {
  isLocale,
  LOCALE_COOKIE,
  publicMessages,
  type Locale,
  type PublicMessages,
} from "@/i18n/messages";

export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "ar";
}

export async function getPublicT(): Promise<{
  locale: Locale;
  t: PublicMessages;
}> {
  const locale = await getRequestLocale();
  return { locale, t: publicMessages[locale] };
}
