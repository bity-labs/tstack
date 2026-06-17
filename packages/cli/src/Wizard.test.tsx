import { describe, expect, it } from "vitest";
import { render } from "ink-testing-library";
import React from "react";

import { Wizard } from "./Wizard.js";

describe("Wizard", () => {
  it("renders the header and slug input first", () => {
    const { lastFrame } = render(
      <Wizard projectDir="/tmp/test" sourceDir="/tmp/src" />,
    );
    expect(lastFrame()).toContain("TStack");
    expect(lastFrame()).toContain("Project slug");
    expect(lastFrame()).toContain("Lowercase letters, numbers, and hyphens only.");
  });
});
