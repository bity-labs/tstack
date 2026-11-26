# ESLint configuration

Shared flat ESLint configuration for TypeScript workspaces. Import the default array from `@tstack/eslint-config` in `eslint.config.js` and append framework-specific rules when required. Generated sources and build outputs are excluded; formatting belongs to Prettier.

This package serves the TStack sites. The independent boilerplate owns its own configuration package under `packages/boilerplate/packages/eslint-config`; neither workspace links to the other's configuration.
