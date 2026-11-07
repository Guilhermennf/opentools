import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { toolCategories, type ToolCategory } from "@opentools/core";
import { locales } from "@opentools/shared";
import { routing } from "@/i18n/routing";
import { registry } from "@/tools/registry";
import { ToolCard } from "@/components/tool-card";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => registry.categories().map((category) => ({ locale, category })));
}

const isCategory = (v: string): v is ToolCategory => (toolCategories as readonly string[]).includes(v);

export async function generateMetadata({ params }: PageProps<"/[locale]/categories/[category]">) {
  const { locale, category } = await params;
  if (!hasLocale(routing.locales, locale) || !isCategory(category)) return {};
  const t = await getTranslations({ locale });
  const name = t(`categories.${category}`);
  return buildMetadata({
    locale,
    path: `/categories/${category}`,
    title: name,
    description: t("seo.categoryDescription", { category: name }),
  });
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/categories/[category]">) {
  const { locale, category } = await params;
  if (!hasLocale(routing.locales, locale) || !isCategory(category)) notFound();
  const tools = registry.byCategory(category);
  if (tools.length === 0) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  return (
    <>
      <p className="label-mono mb-3">{t("categories.pageSubtitle")}</p>
      <h1 className="font-serif mb-10 text-5xl">{t(`categories.${category}`)}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.meta.id} tool={tool} />
        ))}
      </div>
    </>
  );
}
