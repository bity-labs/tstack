import { render } from "ink-testing-library";
import React from "react";
import { describe, expect, it } from "vitest";

import { Header } from "./index.js";

describe("TStack component branding", () => {
  it("renders a TStack header without Eniem source-project branding", () => {
    const { lastFrame } = render(React.createElement(Header));

    expect(lastFrame()).toContain("TStack");
    expect(lastFrame()).toContain("Scaffold your next TStack project");
    expect(lastFrame()).not.toMatch(/eniem|eni\b/i);
  });
});
