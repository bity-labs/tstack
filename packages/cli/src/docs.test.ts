import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const docsRoot = join(repoRoot, "apps/documentation/content/docs");
const archiveUrl = "https://github.com/bity-labs/tstack/tree/v1/apps/documentation/content/docs";

function readRepoFile(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

const docFiles = filesUnder(docsRoot);
const routes = new Set([
  "/llms-full.txt",
  ...docFiles.filter((path) => path.endsWith(".mdx")).map((path) => {
    const slug = relative(docsRoot, path).replace(/\.mdx$/, "").replace(/(^|\/)index$/, "");
    return `/${slug}`;
  }),
]);

describe("v2 documentation", () => {
  it("documents repository commands and the CLI's transitional status", () => {
    const readme = readRepoFile("packages/cli/README.md");
    expect(readme).toContain("pnpm tstack --help");
    expect(readme).toContain("pnpm build");
    expect(readme).toContain("pnpm test");
    expect(readme).toContain("V2 scaffolding is not implemented yet");
    expect(readme).toContain("legacy");
    expect(readme).toContain("../../apps/documentation/content/docs/reference/cli.mdx");
  });

  it.each([
    "README.md",
    "apps/documentation/content/docs/index.mdx",
    "apps/documentation/content/docs/getting-started/quick-start.mdx",
    "apps/documentation/content/docs/boilerplate/overview.mdx",
  ])("distinguishes v2 placeholders from the preserved starter in %s", (path) => {
    const content = readRepoFile(path);
    expect(content).toMatch(/v2 scaffolding is not implemented yet/i);
    expect(content).toMatch(/placeholder/i);
    expect(content).toContain(archiveUrl);
  });

  it("describes legacy commands without claiming they configure v2", () => {
    const guide = readRepoFile("apps/documentation/content/docs/reference/cli.mdx");
    expect(guide).toContain("tstack init");
    expect(guide).toContain("Unavailable");
    expect(guide).toContain("tstack ready");
    expect(guide).toContain("tstack products");
    expect(guide).toContain("not a completed v2 setup workflow");
    expect(guide).toContain("--project-dir /path/to/existing-project");
    expect(guide).toContain("https://github.com/bity-labs/tstack/blob/v1/apps/documentation/content/docs/reference/cli.mdx");
  });

  it("documents only existing source paths in the workspace map", () => {
    const readme = readRepoFile("README.md");
    const context = readRepoFile("docs/context.md");
    for (const path of [
      "apps/documentation", "apps/boilerplate-website", "apps/boilerplate-application",
      "apps/boilerplate-docs", "packages/brain", "packages/harness", "packages/assistant",
      "packages/os", "packages/cli",
    ]) {
      expect(existsSync(join(repoRoot, path)), path).toBe(true);
      expect(context).toContain(path);
      expect(readme).toContain(path.split("/")[1]);
    }
  });

  it("does not present removed v1 paths or the quality branch as current guidance", () => {
    const paths = [
      "README.md", "AGENTS.md", "docs/context.md", "docs/coding-standards.md",
      "packages/cli/README.md", "packages/harness/README.md",
      ...docFiles.map((path) => relative(repoRoot, path)),
    ];
    for (const path of paths) {
      const content = readRepoFile(path);
      expect(content, path).not.toMatch(/apps\/boilerplate(?:\/|`|\s)|@tstack\/boilerplate|tstack-next|(?:tree|blob)\/quality/);
    }
  });

  it("resolves internal documentation links, including the LLM endpoint", () => {
    for (const path of docFiles) {
      const content = readFileSync(path, "utf8");
      for (const match of content.matchAll(/\]\((\/[^)\s]*)\)/g)) {
        const route = match[1].split(/[?#]/)[0];
        expect(routes.has(route), `${relative(docsRoot, path)} -> ${route}`).toBe(true);
      }
    }
    expect(existsSync(join(repoRoot, "apps/documentation/src/app/llms-full.txt/route.ts"))).toBe(true);
  });

  it("resolves every explicit navigation entry to a page or section", () => {
    for (const path of docFiles.filter((path) => path.endsWith("meta.json"))) {
      const meta = JSON.parse(readFileSync(path, "utf8")) as { pages?: string[] };
      for (const page of meta.pages ?? []) {
        if (page.startsWith("[")) continue; // Links are validated above.
        const target = join(dirname(path), page);
        expect(existsSync(`${target}.mdx`) || existsSync(join(target, "meta.json")), `${path} -> ${page}`).toBe(true);
      }
    }
  });
});
