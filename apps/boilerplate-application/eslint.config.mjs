// @tstack/boilerplate-application lint configuration. Browser-oriented,
// combining Next.js core rules with type-aware TypeScript checking.
import next from "eslint-config-next";
import nextTypescript from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", ".next", "next-env.d.ts", "coverage", "eslint.config.mjs"] },
  // eslint-config-next ships a flat config; its typescript entry enables the
  // typed-lint parser wiring used by the Next build.
  ...next,
  ...nextTypescript,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-check": true
        }
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
);
