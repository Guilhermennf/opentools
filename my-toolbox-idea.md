# OpenTools — Project Contract

**Version:** 0.1.1  
**Status:** Initial Product Specification  
**Project type:** Open Source / Free Online Tools  
**Repository:** Public Monorepo  
**License:** MIT (proposed)  
**Supported languages:** Portuguese (Brazil) and English  
**Document purpose:** Define the product vision, MVP scope, technical principles, visual identity, internationalization, SEO strategy, community participation and development guidelines.

---

# 1. Project Overview

## 1.1. The Idea

OpenTools is an open-source platform that provides a growing collection of free, accessible and easy-to-use online utilities.

The purpose is to bring useful tools together in one place, eliminating unnecessary complexity, mandatory accounts, subscriptions and artificial usage restrictions.

The platform starts with three carefully selected tools and evolves based on real user needs and community suggestions.

The project aims to become a reliable destination for everyday utilities, developer tools, file processing and media operations.

## 1.2. Core Principles

- **Free:** All core tools must remain free to use.
- **Open Source:** The platform source code is publicly available.
- **Privacy First:** Process data locally whenever technically possible.
- **No Account Required:** Users should not need an account to use tools.
- **Simple UX:** Every tool should be understandable and usable without instructions.
- **Community Driven:** Users can suggest new tools and improvements.
- **Scalable Architecture:** New tools must be added without restructuring the entire application.
- **Bilingual by Design:** The complete application must support Portuguese (Brazil) and English.
- **SEO and Discoverability:** Every tool must be independently discoverable through search engines and AI assistants in both supported languages.

## 1.3. Product Positioning

OpenTools is not intended to be just another collection of online utilities.

> A free and open collection of useful tools for everyone. Simple, private and without unnecessary complexity.

### Brand principles

| Principle | Description |
|---|---|
| Free Forever | No subscriptions or premium tool restrictions |
| Open by Design | Public source code and transparent development |
| Privacy First | Client-side processing whenever possible |
| Community Driven | Users influence the product roadmap |
| Bilingual | Portuguese and English experiences |
| Minimal Complexity | Focused interfaces and straightforward workflows |

### Suggested tagline

**Useful tools. Zero nonsense.**

Alternative:

**Everything useful. Nothing to pay.**

---

# 2. Internationalization (i18n) and Language Detection

Internationalization is a fundamental architectural requirement, not a feature to add after launch.

The entire platform must support two languages from the first release:

- `pt-BR` — Brazilian Portuguese.
- `en` — English.

Both languages must have complete and equivalent functionality.

Neither language should be treated as a secondary translation.

## 2.1. Automatic Language Detection

The application should automatically identify the user's preferred language based on browser language preferences.

Use:

- `navigator.languages`
- `navigator.language`

These browser properties expose the user's configured language preferences.

Example:

```ts
function detectPreferredLocale(): "pt-BR" | "en" {
  const languages = navigator.languages ?? [
    navigator.language,
  ];

  for (const language of languages) {
    const normalized = language.toLowerCase();

    if (
      normalized === "pt" ||
      normalized.startsWith("pt-")
    ) {
      return "pt-BR";
    }

    if (
      normalized === "en" ||
      normalized.startsWith("en-")
    ) {
      return "en";
    }
  }

  return "en";
}
```

This is the initial detection strategy. The production implementation must also account for server-side rendering and saved user preferences.

## 2.2. Language Selection Priority

The language selection system must follow this priority:

1. Explicit language selection by the user.
2. Previously saved language preference.
3. Browser language preferences.
4. Default fallback language: English.

Examples:

| Browser preference | Selected language |
|---|---|
| `pt-BR` | Portuguese |
| `pt-PT` | Portuguese (Brazil) |
| `en-US` | English |
| `en-GB` | English |
| `es-ES` | English fallback |
| No preference available | English fallback |

Portuguese variants other than Brazilian Portuguese will initially use the `pt-BR` translation.

## 2.3. Language Switcher

A visible language selector must be available in the application navigation.

Options:

- Português (Brasil)
- English

Requirements:

- Allow users to change language manually.
- Save the selected preference.
- Preserve the current tool when switching languages.
- Preserve relevant URL context.
- Avoid unexpected language changes during navigation.
- Never override an explicit user preference with browser detection.

The language preference can be stored in a lightweight cookie or local storage.

A cookie should be preferred when the server needs to know the selected locale before rendering the page.

No user account is required.

## 2.4. URL Architecture

Each language must have its own indexable URL.

Suggested structure:

```text
/pt-BR
/pt-BR/tools/video-audio-downloader
/pt-BR/tools/hash-generator
/pt-BR/tools/json-formatter
/pt-BR/about
/pt-BR/community

/en
/en/tools/video-audio-downloader
/en/tools/hash-generator
/en/tools/json-formatter
/en/about
/en/community
```

The root URL `/` should detect the user's preference and redirect to the appropriate language version.

Once a user is on a localized URL, navigation must preserve that locale.

Language switching must navigate to the equivalent page in the selected language whenever that equivalent exists.

## 2.5. Translation Architecture

All user-facing text must be centralized.

Do not hardcode interface strings directly inside components.

Suggested structure:

```text
apps/web/
└── src/
    ├── i18n/
    │   ├── config.ts
    │   ├── routing.ts
    │   └── dictionaries/
    │       ├── pt-BR.json
    │       └── en.json
    │
    └── messages/
        ├── common/
        ├── tools/
        ├── community/
        └── seo/
```

Example translation:

```json
{
  "navigation": {
    "tools": "Ferramentas",
    "about": "Sobre",
    "community": "Comunidade"
  },
  "home": {
    "title": "Ferramentas úteis.",
    "subtitle": "Sem complicação desnecessária."
  }
}
```

English equivalent:

```json
{
  "navigation": {
    "tools": "Tools",
    "about": "About",
    "community": "Community"
  },
  "home": {
    "title": "Useful tools.",
    "subtitle": "No unnecessary complexity."
  }
}
```

Use a consistent internationalization solution compatible with Next.js App Router, such as `next-intl`.

## 2.6. Translation Requirements

Every new feature must be implemented in both languages.

This includes:

- Navigation.
- Buttons.
- Forms.
- Error messages.
- Loading states.
- Tool descriptions.
- Tool instructions.
- FAQs.
- SEO metadata.
- Community forms.
- Privacy documentation.
- Terms of use.
- Accessibility labels.
- Empty states.
- Notifications.

A feature is not considered complete if only one language is available.

Machine-generated translations must be reviewed for technical accuracy and natural language.

Technical terminology should remain consistent across both languages.

---

# 3. MVP Scope

The MVP must validate three things:

1. Users can discover and use the tools easily.
2. The modular architecture supports independent tool development.
3. Organic traffic and community participation can help the platform grow.

The initial release will contain exactly three tools.

## 3.1. Tool 01 — Video & Audio Downloader

**Category:** Media  
**Priority:** P0 — Core product

### Purpose

Provide a simple interface for downloading authorized media in video or audio formats.

### Initial features

- URL input.
- Media source identification.
- Media metadata preview when available.
- Video download in MP4 when supported and authorized.
- Audio extraction or conversion to MP3 when supported and authorized.
- File upload for authorized media conversion.
- Processing progress.
- Download result.
- Error handling.
- Mobile-responsive interface.

### Supported formats

| Type | Format |
|---|---|
| Video | MP4 |
| Audio | MP3 |

### Important restrictions

Downloads must respect source permissions, copyright and applicable platform terms.

For YouTube links, the application may provide official video embedding, identification and links to authorized download options.

It must not bypass platform restrictions or extract protected streams.

### User experience

1. Paste a supported media URL or upload a file.
2. Validate the source and available permissions.
3. Display media information.
4. Select the desired output format.
5. Process the media where permitted.
6. Download the resulting file.

### Privacy

- Prefer browser-side processing.
- Do not retain uploaded files unnecessarily.
- Do not store users' media.
- Clearly communicate when processing requires an external service.

### Bilingual content

The tool must have complete Portuguese and English interfaces, descriptions, instructions and FAQs.

---

## 3.2. Tool 02 — Hash Generator

**Category:** Developer Tools  
**Priority:** P0

### Purpose

Provide a fast and reliable tool for generating cryptographic hashes from text or files.

### Supported algorithms

| Algorithm | Output size |
|---|---:|
| MD5 | 128 bits |
| SHA-1 | 160 bits |
| SHA-256 | 256 bits |
| SHA-384 | 384 bits |
| SHA-512 | 512 bits |

MD5 and SHA-1 are provided for compatibility and legacy use, not for security-sensitive cryptographic applications.

### Initial features

- Text input.
- File upload.
- Algorithm selection.
- Generate hash.
- Copy result.
- Clear input.
- Display selected algorithm.
- Input and output validation.
- Loading and error states.
- Responsive layout.

### Technical requirements

- Use the Web Crypto API for SHA-1, SHA-256, SHA-384 and SHA-512.
- Provide an appropriate implementation for MD5.
- Prefer local browser execution.
- Use Web Workers when processing larger inputs.
- Support UTF-8 text encoding.
- Clearly distinguish text hashing from file hashing.

### Future improvements

- Compare two hashes.
- Verify file integrity.
- Drag-and-drop file support.
- Checksum verification.
- Multiple file processing.

### Bilingual content

All algorithm descriptions, instructions, technical explanations and FAQs must be available in both languages.

---

## 3.3. Tool 03 — JSON Formatter

**Category:** Developer Tools  
**Priority:** P0

### Purpose

Provide a simple JSON utility for developers who need to format, validate and minify JSON data.

### Initial features

- JSON input editor.
- Format / Beautify.
- Minify.
- Validate JSON.
- Syntax error reporting.
- Copy formatted output.
- Clear input.
- Indentation configuration.
- Example JSON.
- Responsive interface.

### Technical requirements

- Use native JavaScript JSON parsing.
- Validate input before formatting.
- Display useful syntax error information.
- Preserve valid JSON values.
- Execute locally in the browser.
- Avoid sending JSON content to the backend.

### Future improvements

- JSON to TypeScript interface.
- JSON to YAML.
- JSON comparison.
- JSON tree viewer.
- JSONPath support.
- Schema validation.

### Bilingual content

All instructions, error messages, examples and FAQs must be available in Portuguese and English.

---

# 4. MVP Prioritization

| Tool | Category | Priority | Execution |
|---|---|---|---|
| Video & Audio Downloader | Media | P0 | Client / authorized integrations |
| Hash Generator | Developer | P0 | Client-side |
| JSON Formatter | Developer | P0 | Client-side |

The three tools must be functional before the first stable release.

Both languages must be available for every MVP tool.

---

# 5. Visual Identity and UI Design

## 5.1. Design Direction

The visual direction will follow an editorial minimalism aesthetic.

The interface should feel like a carefully designed digital publication rather than a traditional SaaS dashboard.

### Visual characteristics

- Minimalist composition.
- Editorial typography.
- Generous spacing.
- Strong typographic hierarchy.
- Restrained use of color.
- Monospaced typography for technical elements.
- Original ASCII art illustrations.
- Light and dark themes.
- Responsive layouts.

## 5.2. Typography

Suggested typography:

- Headings: Editorial serif or Geist Sans.
- Body: Geist Sans.
- Technical content: Geist Mono.
- ASCII illustrations: Monospaced fonts.

## 5.3. ASCII Art Illustration System

A distinctive requirement of OpenTools is the use of original ASCII art illustrations throughout the UI.

Each tool must have its own visual identity through an ASCII illustration.

| Tool | Illustration concept |
|---|---|
| Video & Audio Downloader | Video frame, download arrow or media player |
| Hash Generator | Binary data, hexadecimal characters or fingerprint |
| JSON Formatter | Braces, indentation and structured data |

### ASCII art requirements

- Original compositions.
- Consistent monospaced typography.
- Responsive rendering.
- Optional CSS animations.
- Accessible fallback descriptions.
- No distortion on smaller screens.
- Avoid excessive visual complexity.

Every illustration must support the visual language of both language versions without depending on language-specific text inside the artwork.

---

# 6. SEO and AI Discoverability Strategy

SEO is a core product requirement.

OpenTools must be designed to be discovered not only by traditional search engines but also by AI assistants and LLM-based search experiences.

The objective is to make every tool an authoritative, useful and easily understandable resource in both Portuguese and English.

## 6.1. SEO Architecture

Each tool must have a dedicated landing page for each language.

Example:

```text
/pt-BR/tools/hash-generator
/en/tools/hash-generator

/pt-BR/tools/json-formatter
/en/tools/json-formatter

/pt-BR/tools/video-audio-downloader
/en/tools/video-audio-downloader
```

Each localized page must have:

- Unique title.
- Unique meta description.
- Localized content.
- Canonical URL.
- Open Graph metadata.
- Correct language declaration.
- Internal links.
- Structured data where appropriate.

## 6.2. Hreflang

Every equivalent language page must reference its alternative version.

Example:

```html
<link
  rel="alternate"
  hreflang="pt-BR"
  href="https://example.com/pt-BR/tools/hash-generator"
/>

<link
  rel="alternate"
  hreflang="en"
  href="https://example.com/en/tools/hash-generator"
/>

<link
  rel="alternate"
  hreflang="x-default"
  href="https://example.com/en/tools/hash-generator"
/>
```

Each localized page must also have its own canonical URL.

Portuguese and English versions must not canonicalize to the same URL.

## 6.3. Localized SEO Keywords

Keyword research and content must be developed independently for each language.

Do not simply translate English keywords into Portuguese.

### Video & Audio Downloader

**English keyword themes:**

- Free video downloader.
- Online video downloader.
- Video to MP4 converter.
- Video to MP3 converter.
- Online audio converter.

**Portuguese keyword themes:**

- Baixar vídeo online.
- Conversor de vídeo MP4.
- Converter vídeo para MP3.
- Conversor de áudio online.
- Download de vídeo autorizado.

### Hash Generator

**English keyword themes:**

- Online hash generator.
- SHA-256 generator.
- MD5 hash generator.
- SHA-512 generator.
- File checksum generator.

**Portuguese keyword themes:**

- Gerador de hash online.
- Gerador SHA-256.
- Gerador MD5.
- Gerador SHA-512.
- Gerar hash de arquivo.
- Verificar checksum.

### JSON Formatter

**English keyword themes:**

- JSON formatter online.
- JSON beautifier.
- JSON validator.
- JSON minifier.
- JSON syntax checker.

**Portuguese keyword themes:**

- Formatador JSON online.
- Formatador de JSON.
- Validador JSON.
- Minificar JSON.
- Embelezar JSON.
- Validar JSON online.

All content must accurately reflect implemented functionality.

## 6.4. LLM Discoverability

The platform must be understandable to search engines, crawlers and AI assistants.

Requirements:

- Clear tool descriptions.
- Localized documentation.
- Descriptive URLs.
- Semantic HTML.
- Server-rendered or statically generated essential content.
- Accurate structured data.
- Internal linking.
- Useful examples.
- Technical explanations.
- FAQ sections.
- Public repository documentation.

### llms.txt

Publish an `/llms.txt` file in English and provide a localized Portuguese equivalent, such as `/pt-BR/llms.txt`.

Each file should explain:

- Project overview.
- Available tools.
- Tool URLs.
- Main capabilities.
- Supported formats and algorithms.
- Documentation URLs.
- Repository URL.
- Community contribution information.

Consider generating `/llms-full.txt` and `/pt-BR/llms-full.txt` with expanded documentation.

These files are discoverability aids, not guaranteed indexing or recommendation mechanisms.

## 6.5. Structured Data

Use JSON-LD where appropriate:

- `WebSite`
- `Organization`
- `WebApplication`
- `SoftwareApplication`
- `BreadcrumbList`
- `FAQPage` only when its requirements are genuinely met.

All structured data must match the visible content of the corresponding language page.

## 6.6. SEO Content Requirements

Each tool page must include:

1. Tool description.
2. Practical instructions.
3. Supported formats or algorithms.
4. Technical explanations.
5. Examples.
6. Privacy information.
7. Frequently asked questions.
8. Related tools.

Content must be original, useful, accurate and localized.

No keyword stuffing, duplicate translations or unsupported claims.

---

# 7. Community Suggestions

Community participation is part of the product identity.

Users should be able to suggest new tools, report problems and influence the platform roadmap.

The MVP will include a Community Suggestions feature integrated with GitHub Issues.

## 7.1. Suggestion Workflow

```text
User opens Community page
          |
          v
Submits tool suggestion
          |
          v
Frontend validates fields
          |
          v
Cloudflare Worker
          |
          v
Rate limiting and validation
          |
          v
GitHub Issues API
          |
          v
Create GitHub Issue
          |
          v
Return issue URL to user
```

## 7.2. Suggestion Form

Required fields:

- Tool name.
- Description.
- Category.
- Problem it solves.
- Optional example or use case.

The form must be available in Portuguese and English.

Suggestions must be stored in the GitHub repository using a consistent language-independent issue structure.

Suggested labels:

```text
community-request
enhancement
bug
good-first-issue
under-review
planned
implemented
```

## 7.3. Community Page

The Community page should include:

- Project repository link.
- Suggest a tool action.
- Existing suggestions.
- Link to open GitHub Issues.
- Contribution guidelines.
- How to report bugs.
- How to contribute code.

The initial release does not require a custom voting database.

Users can interact with public GitHub Issues and use reactions where appropriate.

## 7.4. Abuse Prevention

- Validate all submitted fields.
- Limit request size.
- Apply rate limiting.
- Restrict GitHub token permissions.
- Keep secrets exclusively on the backend.
- Avoid exposing internal API errors.
- Protect against spam and duplicate submissions.

---

# 8. Donations and Monetization

Donations are explicitly outside the MVP scope.

The project will not introduce:

- Pix integration.
- Buy Me a Coffee integration.
- Paid subscriptions.
- Premium tools.
- Paid usage limits.

Optional donation mechanisms may be considered after the initial product is stable.

The core promise remains:

**All core tools are free.**

---

# 9. Technical Architecture

## 9.1. Architecture Style

The project will follow a modular monolith architecture within a public monorepo.

## 9.2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Language | TypeScript |
| Internationalization | next-intl |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Icons | Lucide |
| Validation | Zod |
| Package manager | pnpm |
| Monorepo orchestration | Turborepo |
| Backend | Cloudflare Workers |
| API framework | Hono |
| Client processing | Web APIs / Web Workers |
| Media processing | FFmpeg.wasm where appropriate |
| Testing | Vitest / Playwright |
| CI/CD | GitHub Actions |
| Hosting | Cloudflare Pages / Workers |

## 9.3. Processing Strategy

Client-side processing must be the default whenever possible.

| Tool | Execution |
|---|---|
| Hash Generator | Browser |
| JSON Formatter | Browser |
| Media conversion | Browser where practical |
| External integrations | Backend |

## 9.4. Backend Responsibilities

Initial endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API status |
| POST | `/api/suggestions` | Create GitHub Issue |
| POST | `/api/feedback` | Receive feedback |

The backend will include request validation, rate limiting, CORS, error handling, secure secret management and GitHub API integration.

No database is required for the initial MVP.

---

# 10. Monorepo Structure

```text
opentools/
│
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       │   └── [locale]/
│   │       ├── i18n/
│   │       │   └── dictionaries/
│   │       │       ├── pt-BR.json
│   │       │       └── en.json
│   │       ├── components/
│   │       ├── hooks/
│   │       └── lib/
│   │
│   └── api/
│       └── src/
│           ├── routes/
│           ├── controllers/
│           ├── services/
│           ├── middleware/
│           └── schemas/
│
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── contracts/
│   │       ├── registry/
│   │       ├── engine/
│   │       └── errors/
│   │
│   ├── tools/
│   │   ├── media/
│   │   │   └── video-audio-downloader/
│   │   └── developer/
│   │       ├── hash-generator/
│   │       └── json-formatter/
│   │
│   ├── ui/
│   ├── config/
│   └── shared/
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   ├── CONTRIBUTING.md
│   └── CODE_OF_CONDUCT.md
│
├── docs/
│   ├── architecture.md
│   ├── design-system.md
│   ├── internationalization.md
│   ├── seo-strategy.md
│   ├── adding-a-tool.md
│   └── decisions/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── LICENSE
└── README.md
```

The structure may evolve during implementation, but architectural boundaries must remain clear.

---

# 11. Tool Development Contract

Every tool must follow a common development standard.

## 11.1. Required Metadata

Every tool must define:

- Unique ID.
- Slug.
- Name.
- Description.
- Category.
- Icon.
- Keywords.
- Runtime.
- Version.
- Status.
- Localized descriptions.
- Localized SEO metadata.

## 11.2. Required Components

Every tool must provide:

- Tool metadata.
- Input validation.
- Execution logic.
- Error handling.
- Loading state.
- Result state.
- Copy or download action where applicable.
- Original ASCII art illustration.
- Responsive interface.
- Portuguese content.
- English content.
- SEO metadata for both languages.
- Documentation and localized FAQs.

## 11.3. Independence

A new tool must be addable without changing the core execution engine.

The application should reuse Tool Shell, input components, result components, error components, progress components and SEO utilities.

---

# 12. Privacy and Security

Privacy is a fundamental product requirement.

- No mandatory user accounts.
- No unnecessary personal data collection.
- No storage of uploaded files without an explicit reason.
- No exposure of backend secrets.
- Input validation.
- Secure external integrations.
- Safe error handling.
- Minimal analytics.
- Transparent privacy documentation.

Language detection must not be used as a reason to collect additional personal information.

Browser language preference is used only to select the appropriate interface language.

---

# 13. Testing and Quality

The project will use:

- Vitest for unit tests.
- Playwright for end-to-end tests.
- ESLint for code quality.
- Prettier for formatting.
- TypeScript for static checking.

Additional internationalization tests:

- [ ] Browser set to Portuguese selects `pt-BR`.
- [ ] Browser set to English selects `en`.
- [ ] Unsupported browser language falls back to English.
- [ ] Manual language selection works.
- [ ] Saved language preference is respected.
- [ ] Navigation preserves the selected language.
- [ ] Language switching preserves the current tool.
- [ ] All routes exist in both languages.
- [ ] No untranslated interface strings remain.
- [ ] SEO metadata matches the page language.
- [ ] Hreflang links are correct.

Every tool must also include tests for valid input, invalid input, expected output, error handling and edge cases.

---

# 14. MVP Roadmap

## Phase 01 — Foundation

- Create public GitHub repository.
- Configure pnpm workspaces.
- Configure Turborepo.
- Create Next.js application.
- Configure TypeScript.
- Configure next-intl.
- Implement browser language detection.
- Implement language switcher.
- Establish design tokens.
- Build editorial design system.
- Implement light and dark themes.
- Create ASCII illustration system.

**Deliverable:** Bilingual application with the initial visual identity.

## Phase 02 — Core Architecture

- Define TypeScript contracts.
- Implement Tool Registry.
- Implement Tool Engine.
- Implement Tool Shell.
- Implement localized dynamic tool routing.
- Implement category navigation.
- Implement tool search.
- Implement localized SEO utilities.

**Deliverable:** Modular application capable of hosting independent bilingual tools.

## Phase 03 — MVP Tools

- Implement Video & Audio Downloader.
- Implement Hash Generator.
- Implement JSON Formatter.
- Create individual ASCII illustrations.
- Implement Portuguese and English interfaces.
- Implement localized SEO for each tool.
- Add localized FAQs and documentation.
- Test all tools on desktop and mobile.

**Deliverable:** Three functional tools in both languages.

## Phase 04 — Community

- Create Cloudflare Worker.
- Implement GitHub integration.
- Create bilingual suggestion form.
- Implement request validation.
- Configure rate limiting.
- Create bilingual Community page.
- Configure GitHub Issue templates.

**Deliverable:** Users can suggest new tools in Portuguese or English.

## Phase 05 — SEO and Launch

- Configure localized metadata.
- Configure canonical URLs.
- Configure hreflang.
- Generate sitemap.
- Configure robots.txt.
- Publish llms.txt.
- Publish localized LLM documentation.
- Implement JSON-LD where appropriate.
- Configure Search Console.
- Validate accessibility.
- Validate performance.
- Complete documentation in both languages.
- Publish initial stable release.

**Deliverable:** Public bilingual MVP ready for real users.

---

# 15. Definition of Done

The MVP will be considered complete when:

- [ ] Public repository is available.
- [ ] Monorepo is configured.
- [ ] Frontend is deployed.
- [ ] Backend is deployed.
- [ ] Tool Registry works.
- [ ] Tool Engine works.
- [ ] All three MVP tools are functional.
- [ ] Each tool has its own ASCII illustration.
- [ ] Each tool has an independent URL.
- [ ] Portuguese and English are fully supported.
- [ ] Automatic browser language detection works.
- [ ] Manual language switching works.
- [ ] Language preference is preserved.
- [ ] Each tool has unique localized SEO metadata.
- [ ] Each tool has localized documentation and FAQs.
- [ ] Canonical and hreflang tags are configured.
- [ ] Sitemap and robots.txt are configured.
- [ ] llms.txt is published.
- [ ] Community Suggestions work in both languages.
- [ ] GitHub Issues integration works.
- [ ] Responsive design is validated.
- [ ] Tests pass.
- [ ] Privacy and Terms pages are published in both languages.
- [ ] No paid functionality is required for core use.

---

# 16. Future Development

Future features will be prioritized based on real user demand and community participation.

### Developer Tools

- UUID Generator.
- Base64 Encoder / Decoder.
- JWT Decoder.
- Regex Tester.
- XML Formatter.
- YAML Formatter.
- SQL Formatter.
- URL Encoder / Decoder.
- Timestamp Converter.
- Color Converter.

### File Tools

- Image Converter.
- Image Compressor.
- PDF Merger.
- PDF Splitter.
- PDF to Image.
- File Checksum Verifier.

### Media Tools

- Audio Converter.
- Video Converter.
- Audio Metadata Viewer.
- Media Information Extractor.

### Text Tools

- Word Counter.
- Case Converter.
- Text Diff Checker.
- Lorem Ipsum Generator.
- Markdown Formatter.

### Community

- Dedicated voting system.
- Public roadmap.
- Contributor profiles.
- Tool request tracking.
- Community analytics.

### Optional Support

- Buy Me a Coffee.
- Pix donations.
- International donations.

These features are outside the initial MVP.

---

# 17. Final Product Principles

Every future decision must be evaluated against these principles:

1. Does it keep the platform free?
2. Does it solve a real user problem?
3. Can it be implemented without unnecessary infrastructure?
4. Can it process data locally?
5. Does it maintain privacy?
6. Does it improve discoverability?
7. Is the experience available in Portuguese and English?
8. Does it fit the editorial design system?
9. Can it be implemented as an independent module?
10. Can the community understand and contribute to it?
11. Does it improve the overall product?

If a feature introduces significant complexity without meaningful user value, it should not be prioritized.

---

# 18. Project Mission

OpenTools exists to make useful digital utilities accessible to everyone.

It should grow through practical tools, thoughtful engineering, transparent development and community participation.

The platform must never become unnecessarily complicated or turn basic utilities into paid features.

Language should never be a barrier to using the platform.

**Useful tools. Zero nonsense.**

**Free by design. Open by nature. Built for everyone.**