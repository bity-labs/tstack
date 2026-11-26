# TypeScript configuration

Shared strict compiler settings. Extend `@tstack/typescript-config/base.json` and select module resolution and runtime libraries in the consuming workspace. Framework-owned configurations, including Expo and Astro, retain their own module settings.

This package serves the TStack sites. The independent boilerplate owns its own configuration package under `packages/boilerplate/packages/typescript-config`; neither workspace links to the other's configuration.
