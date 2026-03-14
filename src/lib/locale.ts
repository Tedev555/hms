const LOCALE_COOKIE = "HMS_LOCALE";
const DEFAULT_LOCALE = "en";
const SUPPORTED_LOCALES = ["en", "lo"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

export { LOCALE_COOKIE, DEFAULT_LOCALE, SUPPORTED_LOCALES };
