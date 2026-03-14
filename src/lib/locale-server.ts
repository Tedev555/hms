import { cookies } from "next/headers";
import { LOCALE_COOKIE, DEFAULT_LOCALE, isSupportedLocale } from "./locale";
import type { SupportedLocale } from "./locale";

export async function getUserLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;

  if (localeCookie && isSupportedLocale(localeCookie)) {
    return localeCookie;
  }

  return DEFAULT_LOCALE;
}
