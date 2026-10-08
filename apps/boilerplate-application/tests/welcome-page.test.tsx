import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import HomePage from "@/app/page";
import { runWelcomeProgram } from "@/lib/welcome";

afterEach(cleanup);

/**
 * Behavioral server-component tests: the welcome page renders its real
 * Effect-resolved content by executing the server component's React tree.
 */
describe("HomePage", () => {
  it("renders the Effect-provided welcome headline and description", () => {
    render(<HomePage />);

    const content = runWelcomeProgram();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(content.headline);
    expect(screen.getByText(content.description)).toBeInTheDocument();
  });

  it("renders the docs call to action as a real, safe link", () => {
    render(<HomePage />);

    const link = screen.getByRole("link", { name: "Open the Next.js docs" });
    expect(link).toHaveAttribute("href", "https://nextjs.org/docs");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("renders the shadcn/ui Slot-backed button with button styling on the anchor", () => {
    render(<HomePage />);

    // Button uses Radix Slot in asChild mode, so the anchor is the rendered
    // button element and must carry the button's own data-slot and styling.
    const link = within(screen.getByRole("main")).getByRole("link", {
      name: "Open the Next.js docs"
    });
    expect(link).toHaveAttribute("data-slot", "button");
    expect(link.getAttribute("class")).toContain("bg-primary");
  });
});
