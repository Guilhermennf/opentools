import type { Metadata } from "next";
import { locales, ogLocales, type Locale } from "@opentools/shared";
import { siteConfig } from "@/site.config";

export interface BuildMetadataInput {
  locale: Locale;
  /** Path without locale prefix, e.g. "/tools/hash-generator" or "" for home. */
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
  /** Skip the "%s — OpenTools" title template (home page). */
  titleAbsolute?: boolean;
}

export function localizedUrl(locale: Locale, path: string): string {
  return `${siteConfig.url}/${locale}${path}`;
}

export function buildMetadata({ locale, path, title, description, noindex, titleAbsolute }: BuildMetadataInput): Metadata {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = localizedUrl(l, path);
  languages["x-default"] = localizedUrl("en", path);

  return {
    title: titleAbsolute ? { absolute: title } : title,
    description,
    alternates: { canonical: localizedUrl(locale, path), languages },
    openGraph: {
      title,
      description,
      url: localizedUrl(locale, path),
      siteName: siteConfig.name,
      type: "website",
      locale: ogLocales[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocales[l]),
    },
    twitter: { card: "summary", title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
