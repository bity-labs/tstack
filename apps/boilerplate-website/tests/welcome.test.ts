import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import WelcomePage from "../src/pages/index.astro";

// The welcome page is the website's only behavior: it must render a page
// telling the user what the scaffold is, in the browser-facing document
// (title in the head plus the user-visible body copy), matching the
// one-page plain-CSS scaffold scope in docs/context.md.
describe("welcome page", () => {
  it("renders the boilerplate website welcome document", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(WelcomePage);

    expect(html).toContain("<title>TStack Boilerplate Website</title>");
    expect(html).toContain("Welcome to <strong>TStack</strong>");
    expect(html).toContain(
      "This is the boilerplate website: an independently runnable static Astro application with one"
    );
    expect(html).toContain("Static site scaffolded with Astro in the TStack workspace.");
  });

  it("serves the styled, script-free plain document structure", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(WelcomePage);

    // BaseLayout must still provide the structured document head; losing it
    // would leave a bare unstructured page.
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
    expect(html).not.toContain("<script");
  });
});
