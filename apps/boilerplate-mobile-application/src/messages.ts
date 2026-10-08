/** Runtime-agnostic Effect v4 helper for the welcome screen. No Node-only adapters. */
import { Effect } from "effect";

export const buildWelcomeMessage = (appName: string): Effect.Effect<string> =>
  Effect.sync(() => `Welcome to ${appName}`);

export const welcomeMessage = buildWelcomeMessage("boilerplate-mobile-application");
