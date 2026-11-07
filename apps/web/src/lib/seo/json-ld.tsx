import type { ToolDefinition } from "@opentools/core";
import type { Locale } from "@opentools/shared";
import { siteConfig } from "@/site.config";
import { localizedUrl } from "./metadata";

type JsonLdData = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  // "<" is escaped so content can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, "\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export const websiteJsonLd = (locale: Locale, description: string): JsonLdData => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: localizedUrl(locale, ""),
  inLanguage: locale,
  description,
});

export const organizationJsonLd = (): JsonLdData => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  sameAs: [siteConfig.repository],
});

export const webApplicationJsonLd = (tool: ToolDefinition, locale: Locale): JsonLdData => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: tool.messages[locale].name,
  description: tool.messages[locale].description,
  url: localizedUrl(locale, `/tools/${tool.meta.slug}`),
  inLanguage: locale,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
});

export const breadcrumbJsonLd = (
  locale: Locale,
  items: { name: string; path: string }[],
): JsonLdData => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: localizedUrl(locale, item.path),
  })),
});

export const faqJsonLd = (faq: { question: string; answer: string }[]): JsonLdData => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
});
