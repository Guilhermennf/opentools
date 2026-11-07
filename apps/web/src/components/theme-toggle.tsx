"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@opentools/ui";

export function ThemeToggle() {
  const t = useTranslations("a11y");
  const { theme = "system", setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const Icon = !mounted || theme === "system" ? Monitor : theme === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("theme")}>
          <Icon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={mounted ? theme : "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">{t("themeLight")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">{t("themeDark")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">{t("themeSystem")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
