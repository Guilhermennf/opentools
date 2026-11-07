import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({
    locale,
    path: "/about",
    title: t("aboutTitle"),
    description: t("aboutDescription"),
  });
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });
  return (
    <>
      <h1 className="mb-8 font-serif text-5xl">{t("title")}</h1>
      <div className="max-w-prose space-y-4 text-lg">
        <p>{t("body1")}</p>
        <p>{t("body2")}</p>
        <p>{t("body3")}</p>
      </div>
    </>
  );
}
