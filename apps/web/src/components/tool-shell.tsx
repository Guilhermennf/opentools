import { getTranslations } from "next-intl/server";
import type { ToolDefinition } from "@opentools/core";
import type { Locale } from "@opentools/shared";
import { AsciiArt, Badge } from "@opentools/ui";
import { Link } from "@/i18n/navigation";
import { toolComponents } from "@/tools/components";
import { ToolCard } from "./tool-card";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="label-mono mb-4">{title}</h2>
      {children}
    </section>
  );
}

interface ToolShellProps {
  tool: ToolDefinition;
  locale: Locale;
  related: ToolDefinition[];
}

export async function ToolShell({ tool, locale, related }: ToolShellProps) {
  const t = await getTranslations({ locale });
  const m = tool.messages[locale];
  const c = m.content;
  const UI = toolComponents[tool.meta.slug];

  return (
    <article>
      <nav aria-label={t("a11y.breadcrumb")} className="label-mono mb-6 flex flex-wrap gap-2">
        <Link href="/tools" className="hover:text-accent">
          {t("nav.tools")}
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/categories/${tool.meta.category}`} className="hover:text-accent">
          {t(`categories.${tool.meta.category}`)}
        </Link>
      </nav>

      <header className="grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="font-serif text-5xl leading-tight sm:text-6xl">{m.name}</h1>
          <p className="text-muted-foreground mt-4 max-w-prose text-lg">{m.description}</p>
          {tool.meta.status === "coming-soon" ? (
            <Badge className="mt-4">{t("common.comingSoon")}</Badge>
          ) : null}
        </div>
        <AsciiArt art={tool.ascii} label={tool.asciiLabel[locale]} className="mx-auto w-full max-w-md md:ml-auto" />
      </header>

      <div className="mt-12">
        {UI ? (
          <UI />
        ) : (
          <div className="rounded-md border border-dashed p-8">
            <h2 className="font-serif text-2xl">{t("toolShell.comingSoonTitle")}</h2>
            <p className="text-muted-foreground mt-2 max-w-prose">{t("toolShell.comingSoonText")}</p>
          </div>
        )}
      </div>

      {c?.instructions?.length ? (
        <Section title={t("toolShell.instructions")}>
          <ol className="list-decimal space-y-2 pl-5">
            {c.instructions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Section>
      ) : null}
      {c?.formats?.length ? (
        <Section title={t("toolShell.formats")}>
          <ul className="flex flex-wrap gap-2 font-mono text-sm">
            {c.formats.map((f) => (
              <li key={f} className="rounded-sm border px-2 py-1">
                {f}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {c?.technical ? (
        <Section title={t("toolShell.technical")}>
          <p className="max-w-prose">{c.technical}</p>
        </Section>
      ) : null}
      {c?.examples?.length ? (
        <Section title={t("toolShell.examples")}>
          <ul className="space-y-2 font-mono text-sm break-all">
            {c.examples.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Section>
      ) : null}
      {c?.privacy ? (
        <Section title={t("toolShell.privacy")}>
          <p className="max-w-prose">{c.privacy}</p>
        </Section>
      ) : null}
      {c?.faq?.length ? (
        <Section title={t("toolShell.faq")}>
          <dl className="space-y-5">
            {c.faq.map((f) => (
              <div key={f.question}>
                <dt className="font-medium">{f.question}</dt>
                <dd className="text-muted-foreground mt-1">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}
      {related.length ? (
        <Section title={t("toolShell.related")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((r) => (
              <ToolCard key={r.meta.id} tool={r} />
            ))}
          </div>
        </Section>
      ) : null}
    </article>
  );
}
