import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales } from "@opentools/shared";
import { routing } from "@/i18n/routing";
import { registry } from "@/tools/registry";
import { ToolShell } from "@/components/tool-shell";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbJsonLd, JsonLd, webApplicationJsonLd } from "@/lib/seo/json-ld";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    registry.all().map((tool) => ({ locale, slug: tool.meta.slug })),
  );
}

export async function generateMetadata({ params }: PageProps<"/[locale]/tools/[slug]">) {
  const { locale, slug } = await params;
  const tool = registry.getBySlug(slug);
  if (!hasLocale(routing.locales, locale) || !tool) return {};
  const { seo } = tool.messages[locale];
  return buildMetadata({
    locale,
    path: `/tools/${slug}`,
    title: seo.title,
    description: seo.description,
    // Keep unreleased tools out of search indexes until their UI ships.
    noindex: tool.meta.status === "coming-soon",
  });
}

export default async function ToolPage({ params }: PageProps<"/[locale]/tools/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const tool = registry.getBySlug(slug);
  if (!tool) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <>
      <ToolShell tool={tool} locale={locale} related={registry.related(slug)} />
      <JsonLd
        data={[
          webApplicationJsonLd(tool, locale),
          breadcrumbJsonLd(locale, [
            { name: t("nav.tools"), path: "/tools" },
            { name: tool.messages[locale].name, path: `/tools/${slug}` },
          ]),
        ]}
      />
    </>
  );
}
