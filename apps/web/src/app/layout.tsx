import type { ReactNode } from "react";

// Root layout is a passthrough: <html> lives in app/[locale]/layout.tsx so `lang` is per-locale.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
