import { useTranslations } from "next-intl";
import { siteConfig } from "@/site.config";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="mt-24 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-sm sm:px-6">
        <p className="font-serif text-foreground text-lg">{t("common.tagline")}</p>
        <p>{t("footer.rights")}</p>
        <p>
          {t("footer.license")}{" "}
          <a href={siteConfig.repository} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-accent">
            {t("nav.github")}
            <span className="sr-only"> ({t("common.openInNewTab")})</span>
          </a>
        </p>
      </div>
    </footer>
  );
}
