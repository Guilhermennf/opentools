export const siteConfig = {
  name: "OpenTools",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  repository: "https://github.com/opentools-org/opentools",
} as const;
