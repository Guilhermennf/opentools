# 0003: Own locale detection in the proxy

**Status:** accepted

next-intl's built-in detection does not guarantee the spec's priority order or `pt-PT` → `pt-BR`. We disable it and implement detection in `apps/web/src/proxy.ts` using `matchLocale` and `parseAcceptLanguage` from `@opentools/shared`.

Only unprefixed URLs are redirected, so an explicit choice made via a localized URL always wins. Covered by Playwright tests.
