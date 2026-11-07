import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, matchLocale, parseAcceptLanguage } from "@opentools/shared";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const hasLocalePrefix = (pathname: string) =>
  routing.locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));

/**
 * Locale priority (spec 2.2): saved cookie > browser Accept-Language > English.
 * Only unprefixed URLs are redirected; a localized URL is never overridden.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!hasLocalePrefix(pathname)) {
    const saved = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(saved)
      ? saved
      : matchLocale(parseAcceptLanguage(request.headers.get("accept-language")));
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    const response = NextResponse.redirect(url, 307);
    response.headers.set("Vary", "Accept-Language, Cookie");
    return response;
  }

  return intl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
