# Internationalization

Locales: `pt-BR` and `en` (defined in `packages/shared/src/locales.ts`). URLs always carry the locale prefix: `/pt-BR/...`, `/en/...`.

## Locale selection (priority)

1. Explicit choice via the language switcher.
2. Saved `NEXT_LOCALE` cookie (1 year, `SameSite=Lax`).
3. Browser `Accept-Language`.
4. English.

Any Portuguese variant (`pt`, `pt-PT`, ...) maps to `pt-BR`; any English variant to `en`; everything else to `en`.

## How it works

`apps/web/src/proxy.ts` redirects **only unprefixed URLs** using the order above, then delegates to next-intl. A localized URL is never overridden, so browser language cannot undo an explicit choice. The switcher writes the cookie and navigates to the same page in the other locale, keeping the query string.

next-intl's own detection is disabled (`localeDetection: false`); our proxy owns it so `pt-PT` → `pt-BR` is deterministic.

## Messages

- App chrome: `apps/web/src/i18n/messages/{en,pt-BR}.json`, typed from `en.json` (a wrong key fails typecheck).
- Tool text: next to each tool, `packages/tools/*/*/src/messages/{en,pt-BR}.json`.
- A unit test asserts both languages have identical keys and no empty values.

## Rules

Never hardcode UI strings. Write SEO keywords per language rather than translating them. Keep slugs identical across locales. Review machine translations.
