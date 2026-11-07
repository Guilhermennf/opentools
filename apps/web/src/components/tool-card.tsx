import { useLocale, useTranslations } from "next-intl";
import type { ToolDefinition } from "@opentools/core";
import { Badge } from "@opentools/ui";
import { Link } from "@/i18n/navigation";

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const locale = useLocale() as "pt-BR" | "en";
  const t = useTranslations();
  const m = tool.messages[locale];
  return (
    <Link
      href={`/tools/${tool.meta.slug}`}
      className="hover:border-foreground group flex flex-col gap-3 rounded-md border p-5 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-mono">{t(`categories.${tool.meta.category}`)}</span>
        {tool.meta.status === "coming-soon" ? <Badge>{t("common.comingSoon")}</Badge> : null}
      </div>
      <h3 className="font-serif text-2xl leading-tight group-hover:text-accent">{m.name}</h3>
      <p className="text-muted-foreground text-sm">{m.tagline}</p>
    </Link>
  );
}
