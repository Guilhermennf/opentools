# Design system

Direction: editorial minimalism, like a digital publication.

- **Tokens** live in `packages/ui/src/styles/globals.css` (CSS variables + Tailwind v4 `@theme`). Light and dark themes via the `.dark` class (`next-themes`).
- **Type**: Instrument Serif for display headings, Geist for body, Geist Mono for technical text, labels and ASCII art. `.label-mono` is the small uppercase metadata label.
- **Style**: hairline borders, no shadows, small radius, one accent color.
- **ASCII art**: `AsciiArt` renders a `<figure role="img" aria-label>` with an `aria-hidden` `<pre>`. Font size derives from container width and line length, so art never wraps or distorts on mobile. Pulse animation is opt-in and disabled under `prefers-reduced-motion`. Art must contain no language-specific text.
- **Components** (`packages/ui`): Button, Badge, DropdownMenu, AsciiArt, CopyButton, ToolErrorBox, ToolProgress, ResultPanel. Add more shadcn components as tools need them.
