// @tstack/boilerplate-website lint configuration. Astro + TypeScript rules
// from the Astro plugin's flat recommended preset.
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "dist", ".astro", "eslint.config.mjs"] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.astro"],
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
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ],
      // Scaffold component props thin an extended component type with an
      // empty interface; keep that shared with the Nimbus scaffold.
      "@typescript-eslint/no-empty-object-type": [
        "error",
        { allowInterfaces: "with-single-extends" }
      ]
    }
  }
);
