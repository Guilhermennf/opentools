import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export const base = tseslint.config(
  { ignores: ["**/node_modules/**", "**/.next/**", "**/.open-next/**", "**/dist/**", "**/next-env.d.ts", "**/.wrangler/**", "**/coverage/**", "**/playwright-report/**", "**/test-results/**", "**/cloudflare-env.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);

export default base;
