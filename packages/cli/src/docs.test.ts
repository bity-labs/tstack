import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("CLI documentation", () => {
  it("packages/cli/README.md documents maintainer-oriented local development commands", () => {
    const readme = readRepoFile("packages/cli/README.md");

    expect(readme).toContain("pnpm tstack");
    expect(readme).toContain("pnpm build");
    expect(readme).toContain("pnpm test");
  });

  it("root README mentions packages/cli as the customer CLI package", () => {
    const rootReadme = readRepoFile("README.md");

    expect(rootReadme).toMatch(/customer(-facing)?/i);
    expect(rootReadme).toContain("packages/cli");
  });

  it("apps/documentation includes a buyer-facing CLI guide", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");

    expect(guide).toContain("TStack CLI");
  });

  it("CLI guide explains the repo-run distribution model", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");

    expect(guide).toContain("TStack repository");
    expect(guide).toMatch(/npm publish(ing)? is out of scope/i);
  });

  it("CLI guide documents tstack init, tstack ready, and tstack products with copy-paste commands", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");

    expect(guide).toContain("tstack init");
    expect(guide).toContain("tstack ready");
    expect(guide).toContain("tstack products");
    expect(guide).toContain("```sh");
  });

  it("CLI guide explains working directories and --project-dir usage", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");

    expect(guide).toContain("--project-dir");
    expect(guide).toMatch(/working director(y|ies)/i);
  });

  it("CLI guide explains the full bootstrap flow", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");

    expect(guide).toMatch(/clone/i);
    expect(guide).toContain("pnpm install");
    expect(guide).toContain("tstack init");
    expect(guide).toMatch(/(enter|cd|generated|scaffolded)/i);
  });

  it("CLI guide explains Polar product setup, sandbox vs production, --token, and generated billing exports", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");

    expect(guide).toMatch(/polar/i);
    expect(guide).toContain("sandbox");
    expect(guide).toContain("production");
    expect(guide).toContain("--token");
    expect(guide).toMatch(/(bill|export|generated)/i);
  });

  it("packages/cli/README.md links to buyer-facing docs", () => {
    const readme = readRepoFile("packages/cli/README.md");

    expect(readme).toMatch(/buyer(-facing)? doc/i);
  });

  it("documentation avoids Eniem branding", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");
    const readme = readRepoFile("packages/cli/README.md");
    const rootReadme = readRepoFile("README.md");

    expect(guide).not.toMatch(/eniem/i);
    expect(readme).not.toMatch(/eniem/i);
    expect(rootReadme).not.toMatch(/eniem/i);
  });

  it("introduction no longer claims CLI does not exist", () => {
    const intro = readRepoFile("apps/documentation/content/docs/index.mdx");

    expect(intro).not.toContain("does not currently ship a CLI");
  });

  it("manual standalone extraction references tstack init", () => {
    const extraction = readRepoFile("apps/documentation/content/docs/getting-started/manual-standalone-extraction.mdx");

    expect(extraction).toContain("tstack init");
  });

  it("product configuration no longer claims there is no product CLI", () => {
    const productConfig = readRepoFile("apps/documentation/content/docs/payments/product-configuration.mdx");

    expect(productConfig).not.toContain("There is no buyer-facing TStack command for syncing products");
  });
});
