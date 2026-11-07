import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AsciiArt, Button } from "@opentools/ui";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { registry } from "@/tools/registry";
import { ToolCard } from "@/components/tool-card";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale });
  return buildMetadata({ locale, path: "", title: t("seo.homeTitle"), titleAbsolute: true, description: t("common.description") });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const hero = registry.getBySlug("json-formatter");

  return (
    <>
      <section className="grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="label-mono mb-4">{t("common.tagline")}</p>
          <h1 className="font-serif text-6xl leading-[0.95] sm:text-7xl">{t("home.title")}</h1>
          <p className="font-serif text-muted-foreground mt-2 text-4xl leading-tight sm:text-5xl">{t("home.subtitle")}</p>
          <p className="text-muted-foreground mt-6 max-w-prose">{t("home.intro")}</p>
          <Button asChild variant="accent" className="mt-8">
            <Link href="/tools">{t("home.browseTools")}</Link>
          </Button>
        </div>
        {hero ? <AsciiArt art={hero.ascii} label={hero.asciiLabel[locale]} animated className="max-w-xs md:ml-auto" /> : null}
      </section>

      <section className="mt-20">
        <h2 className="label-mono mb-6">{t("toolsPage.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registry.all().map((tool) => (
            <ToolCard key={tool.meta.id} tool={tool} />
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="label-mono mb-6">{t("home.principlesTitle")}</h2>
        <dl className="grid gap-8 sm:grid-cols-2">
          {(["free", "private", "open", "bilingual"] as const).map((k) => (
            <div key={k}>
              <dt className="font-serif text-2xl">{t(`home.principles.${k}`)}</dt>
              <dd className="text-muted-foreground mt-1 text-sm">{t(`home.principles.${k}Text`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
