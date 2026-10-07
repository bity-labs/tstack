import { Context, Effect, Layer } from "effect";

/**
 * Welcome model provided through an Effect service and layer so the scaffold
 * exercises Effect v4 end to end without introducing product behavior.
 */
export class WelcomeContent extends Context.Service<
  WelcomeContent,
  {
    readonly title: string;
    readonly headline: string;
    readonly description: string;
  }
>()("WelcomeContent") {}

export const welcomeContentLayer = Layer.succeed(WelcomeContent, {
  title: "TStack Boilerplate Application",
  headline: "Welcome to the TStack boilerplate application.",
  description:
    "A minimal Next.js App Router scaffold running Effect v4 with Tailwind CSS and shadcn/ui."
});

/**
 * Resolves the welcome page content synchronously at request time from the
 * server component. Runtime-independent, so nothing here pulls Node-only
 * Effect platform adapters into client bundles.
 */
export const welcomeProgram: Effect.Effect<
  { readonly title: string; readonly headline: string; readonly description: string },
  never,
  WelcomeContent
> = Effect.gen(function* () {
  return yield* WelcomeContent;
});

export const runWelcomeProgram = () =>
  Effect.runSync(Effect.provide(welcomeProgram, welcomeContentLayer));
