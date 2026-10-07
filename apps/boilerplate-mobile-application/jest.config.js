/** Jest config for the Expo app: jest-expo preset with RNTL.
 * pnpm layout + ESM-only deps (effect) require transforming node_modules too. */
module.exports = {
  preset: "jest-expo",
  transformIgnorePatterns: [],
};
