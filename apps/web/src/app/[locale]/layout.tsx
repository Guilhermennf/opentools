import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { locales } from "@opentools/shared";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { siteConfig } from "@/site.config";
import "../globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-instrument-serif" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: t("siteName"), template: `%s — ${t("siteName")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "a11y" });
  const common = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <NextIntlClientProvider>
            <a href="#main" className="bg-background sr-only z-50 p-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
              {t("skipToContent")}
            </a>
            <SiteHeader />
            <main id="main" className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
              {children}
            </main>
            <SiteFooter />
            <JsonLd data={[websiteJsonLd(locale, common("description")), organizationJsonLd()]} />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
