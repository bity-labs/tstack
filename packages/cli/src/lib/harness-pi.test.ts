import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templates = new URL("../../../harness/templates/", import.meta.url);

function readTemplate(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, templates)), "utf8");
}

describe("Pi harness declarations", () => {
  it.each(["dev-t1", "dev-t2", "dev-t3", "scout", "planner"])(
    "declares the acceptance role and fresh context for %s",
    (name) => {
      const agent = readTemplate(`default/.pi/agents/${name}.md`);
      const role = name.startsWith("dev-") ? "writer" : "read-only";
      expect(agent).toContain(`acceptanceRole: ${role}\n`);
      expect(agent).toMatch(/^defaultContext: fresh$/m);
    }
  );
  it("declares an inspection-only reviewer instead of relying on no-edit prose", () => {
    const reviewer = readTemplate("default/.pi/agents/reviewer.md");
    expect(reviewer).toMatch(/^acceptanceRole: read-only$/m);
    expect(reviewer).toMatch(/^tools: read, grep, find, ls, watchdog_diff, contact_supervisor$/m);
    expect(reviewer).toMatch(/^defaultContext: fresh$/m);
  });
});
