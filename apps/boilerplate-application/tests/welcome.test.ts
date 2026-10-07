import { layer } from "@effect/vitest"
import { Effect } from "effect"
import { assert, it } from "vitest"
import { WelcomeContent, welcomeContentLayer } from "../src/lib/welcome"

layer(welcomeContentLayer)("welcome content", (it) => {
  it.effect("provides the app title, headline and description", () =>
    Effect.gen(function* () {
      const content = yield* WelcomeContent
      assert.deepStrictEqual({ ...content }, {
        title: "TStack Boilerplate Application",
        headline: "Welcome to the TStack boilerplate application.",
        description:
          "A minimal Next.js App Router scaffold running Effect v4 with Tailwind CSS and shadcn/ui.",
      })
    }))
})
