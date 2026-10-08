import { runSync } from "effect/Effect";

import { buildWelcomeMessage, welcomeMessage } from "../src/messages";

describe("welcome message Effect v4 program", () => {
  it("produces the expected message via the shared program", () => {
    expect(runSync(welcomeMessage)).toBe("Welcome to boilerplate-mobile-application");
  });

  it("builds an Effect that produces the given app name's message", () => {
    expect(runSync(buildWelcomeMessage("other"))).toBe("Welcome to other");
  });
});
