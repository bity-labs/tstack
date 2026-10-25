import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templates = new URL("../../../harness/templates/", import.meta.url);
const contractDir = "default/.pi/prompts/autoshift/";

function readTemplate(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, templates)), "utf8");
}

interface RoleOverride {
  tools: string[];
  skills: string[];
  acceptanceRole: "read-only" | "writer";
  defaultContext: string;
  inheritProjectContext: boolean;
  inheritSkills: boolean;
  model?: string;
  systemPrompt?: string;
}

function readOverrides(): Record<string, RoleOverride> {
  const settings = JSON.parse(readTemplate(`${contractDir}settings.example.json`)) as {
    subagents: { agentOverrides: Record<string, RoleOverride> };
  };
  return settings.subagents.agentOverrides;
}

describe("Pi harness declarations (not model-compliance tests)", () => {
  it("configures read-only builtin reviewers and scouts without replacing their prompts", () => {
    const overrides = readOverrides();
    for (const name of ["reviewer", "scout"]) {
      const role = overrides[name];
      expect(role.acceptanceRole).toBe("read-only");
      expect(role.defaultContext).toBe("fresh");
      expect(role.tools).toEqual(
        expect.arrayContaining(["read", "grep", "find", "ls", "contact_supervisor"])
      );
      for (const forbidden of ["bash", "edit", "write", "subagent"]) {
        expect(role.tools).not.toContain(forbidden);
      }
      expect(role.model).toBeUndefined();
      expect(role.systemPrompt).toBeUndefined();
      expect(role.inheritProjectContext).toBe(true);
      expect(role.inheritSkills).toBe(false);
    }
    expect(overrides.reviewer.skills).toEqual([]);
    expect(overrides.scout.skills).toEqual(["understand-codebase"]);
  });

  it("keeps the planner inspection-only and fresh", () => {
    const planner = readTemplate("default/.pi/agents/planner.md");
    expect(planner).toMatch(/^acceptanceRole: read-only$/m);
    expect(planner).toMatch(/^tools: read, grep, find, ls, contact_supervisor$/m);
    expect(planner).toMatch(/^defaultContext: fresh$/m);
  });
});
