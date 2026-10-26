// @tstack/boilerplate-api lint configuration. Node-oriented, type-aware.
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "dist", ".vitest", "eslint.config.mjs", "coverage"] },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    languageOptions: {
      ...config.languageOptions,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    }
  })),
  {
    files: ["**/*.ts"],
    rules: {
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
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
);
