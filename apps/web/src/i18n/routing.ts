import { defineRouting } from "next-intl/routing";
import { defaultLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, locales } from "@opentools/shared";

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
  localeCookie: { name: LOCALE_COOKIE, maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax", path: "/" },
});
