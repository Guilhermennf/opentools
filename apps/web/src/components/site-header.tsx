import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const t = useTranslations();
  const links = [
    { href: "/tools", label: t("nav.tools") },
    { href: "/about", label: t("nav.about") },
    { href: "/community", label: t("nav.community") },
  ] as const;

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" aria-label={t("nav.home")} className="font-serif text-2xl leading-none">
          {t("common.siteName")}
        </Link>
        <nav aria-label={t("nav.main")} className="order-3 flex w-full gap-5 text-sm sm:order-none sm:w-auto">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-accent">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
