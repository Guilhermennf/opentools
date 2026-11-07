"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@opentools/ui";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localeLabels,
  locales,
} from "@opentools/shared";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const t = useTranslations("a11y");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function change(next: string) {
    if (!isLocale(next) || next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    // Same page in the other language (slugs are identical across locales); query is preserved.
    const query = Object.fromEntries(new URLSearchParams(window.location.search));
    router.replace({ pathname, query }, { locale: next });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("language")}>
          <Languages aria-hidden />
          <span className="label-mono text-foreground">{locale === "pt-BR" ? "PT" : "EN"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={change}>
          {locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l}>
              {localeLabels[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
