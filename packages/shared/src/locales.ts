export const locales = ["pt-BR", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const localeLabels: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

export const ogLocales: Record<Locale, string> = {
  "pt-BR": "pt_BR",
  en: "en_US",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
