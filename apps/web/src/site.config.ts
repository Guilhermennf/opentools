// On Vercel, fall back to the deployment's own host so canonical/hreflang URLs are correct.
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
const fallback = vercelHost ? `https://${vercelHost}` : "http://localhost:3000";

export const siteConfig = {
  name: "OpenTools",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? fallback).replace(/\/$/, ""),
  repository: "https://github.com/opentools-org/opentools",
} as const;
