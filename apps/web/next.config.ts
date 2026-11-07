import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@opentools/core",
    "@opentools/shared",
    "@opentools/ui",
    "@opentools/tool-hash-generator",
    "@opentools/tool-json-formatter",
    "@opentools/tool-media-converter",
  ],
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
