import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Button } from "@opentools/ui";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/site.config";

export async function generateMetadata({ params }: PageProps<"/[locale]/community">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({
    locale,
    path: "/community",
    title: t("communityTitle"),
    description: t("communityDescription"),
  });
}

export default async function CommunityPage({ params }: PageProps<"/[locale]/community">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "community" });
  const common = await getTranslations({ locale, namespace: "common" });
  return (
    <>
      <h1 className="font-serif text-5xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-2 mb-8">{t("subtitle")}</p>
      <p className="max-w-prose text-lg">{t("body")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="default">
          <a href={siteConfig.repository} target="_blank" rel="noreferrer">
            {t("repository")}
            <span className="sr-only"> ({common("openInNewTab")})</span>
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={`${siteConfig.repository}/issues`} target="_blank" rel="noreferrer">
            {t("issues")}
            <span className="sr-only"> ({common("openInNewTab")})</span>
          </a>
        </Button>
      </div>
    </>
  );
}
