import { useTranslations } from "next-intl";
import { Button } from "@opentools/ui";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <>
      <h1 className="font-serif text-5xl">{t("title")}</h1>
      <p className="text-muted-foreground mt-3 mb-8 max-w-prose">{t("text")}</p>
      <Button asChild variant="accent">
        <Link href="/">{t("back")}</Link>
      </Button>
    </>
  );
}
