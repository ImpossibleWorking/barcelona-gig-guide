import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isLocale,
  Locale,
  LOCALE_COOKIE,
} from "@/lib/i18n/config";
import { messages, Messages } from "@/lib/i18n/messages";

export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  if (isLocale(cookie)) return cookie;
  return detectLocale(headers().get("accept-language"));
}

export function getMessages(locale: Locale = getLocale()): Messages {
  return messages[locale];
}
