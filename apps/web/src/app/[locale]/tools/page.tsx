import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { registry } from "@/tools/registry";
import { ToolSearch } from "@/components/tool-search";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]/tools">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "seo" });
  return buildMetadata({ locale, path: "/tools", title: t("toolsTitle"), description: t("toolsDescription") });
}

export default async function ToolsPage({ params }: PageProps<"/[locale]/tools">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "toolsPage" });
  return (
    <>
      <h1 className="font-serif text-5xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-2 mb-10">{t("subtitle")}</p>
      <ToolSearch tools={[...registry.all()]} />
    </>
  );
}
