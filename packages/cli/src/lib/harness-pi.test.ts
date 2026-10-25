import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const templates = new URL("../../../harness/templates/", import.meta.url);
const contractDir = "default/.pi/prompts/autoshift/";

function readTemplate(path: string): string {
  return readFileSync(fileURLToPath(new URL(path, templates)), "utf8");
}

function templatePath(path: string): string {
  return fileURLToPath(new URL(path, templates));
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
  it("keeps only the planner as a project agent definition", () => {
    const agentsDir = "default/.pi/agents/";
    expect(readTemplate(`${agentsDir}planner.md`)).toMatch(/^name: planner$/m);
    expect(readTemplate(`${agentsDir}README.md`)).toContain("Implementation tiers");
    for (const removed of ["dev-t1.md", "dev-t2.md", "dev-t3.md", "scout.md", "reviewer.md"]) {
      expect(existsSync(templatePath(`${agentsDir}${removed}`)), removed).toBe(false);
    }
  });

  it("documents the deployment contract beside the prompt", () => {
    const note = readTemplate(`${contractDir}note.md`);
    expect(note).toContain("settings.example.json");
    expect(note).toContain("docs/engineering/roles.md");
    expect(note).toContain("Not a test");
    expect(existsSync(templatePath(`${contractDir}settings.json`))).toBe(false);
  });

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
    // R1: fresh reviewers must receive the shared inspection contract through
    // this override, not depend on per-launch selection.
    expect(overrides.reviewer.skills).toEqual(["review-change"]);
    expect(overrides.scout.skills).toEqual(["understand-codebase"]);
    for (const [name, role] of Object.entries(overrides)) {
      for (const skill of role.skills) {
        expect(
          existsSync(templatePath(`default/.agents/skills/${skill}/SKILL.md`)),
          `${name} skill ${skill}`
        ).toBe(true);
      }
    }
  });

  it("keeps the planner inspection-only and fresh", () => {
    const planner = readTemplate("default/.pi/agents/planner.md");
    expect(planner).toMatch(/^acceptanceRole: read-only$/m);
    expect(planner).toMatch(/^tools: read, grep, find, ls, contact_supervisor$/m);
    expect(planner).toMatch(/^defaultContext: fresh$/m);
  });

  it("pins no concrete model in any reusable agent definition or role override", () => {
    // R2: model routing is deployment configuration. Project agent files
    // shadow bundled builtins wholesale, and every template agent definition
    // is reusable payload, so none of them may pin a provider-specific model.
    for (const template of readdirSync(templatePath(""), { withFileTypes: true })) {
      if (!template.isDirectory()) continue;
      const agentsDir = templatePath(`${template.name}/.pi/agents`);
      for (const file of readdirSync(agentsDir)) {
        if (!file.endsWith(".md")) continue;
        const definition = readFileSync(`${agentsDir}/${file}`, "utf8");
        expect(definition, `${template.name}/${file}`).not.toMatch(/^model:/m);
      }
    }
    const overrides = readOverrides();
    for (const [name, role] of Object.entries(overrides)) {
      expect(role.model, `override ${name}`).toBeUndefined();
    }
  });

  it("shares the inspection methodology between code-review and review-change", () => {
    // S1: code-review stays the familiar end-to-end entry point; the
    // inspection procedure lives once in review-change and is reused, so
    // publication and inspection guidance cannot drift apart.
    const codeReview = readTemplate("default/.agents/skills/code-review/SKILL.md");
    expect(codeReview).toContain("review-change");
    const reviewChange = readTemplate("default/.agents/skills/review-change/SKILL.md");
    expect(reviewChange).toContain("APPROVE");
    expect(reviewChange).toContain("Do not post comments");
  });

  it("fails closed on required findings and blocked reviews (documented contract)", () => {
    // R4: static contract guard for the review semantics — required findings
    // are mandatory before merge/acceptance, and a blocked inspection never
    // resolves to a terminal PR state. This pins the documented wording, not
    // runtime model compliance.
    const normalize = (text: string): string => text.replace(/\s+/g, " ");
    const reviewChange = normalize(readTemplate("default/.agents/skills/review-change/SKILL.md"));
    expect(reviewChange).toContain(
      "before merge/acceptance; lower severity than a blocker, but never optional"
    );
    expect(reviewChange).not.toContain("does not block merge");
    expect(reviewChange).toContain("`CHANGES` — at least one blocker or required finding");
    expect(reviewChange).toContain("`APPROVE` — no unresolved blockers or required findings");

    const codeReview = normalize(readTemplate("default/.agents/skills/code-review/SKILL.md"));
    expect(codeReview).toContain(
      "`APPROVE` — set `ready-to-merge` only when validation evidence is adequate"
    );
    expect(codeReview).toContain("`CHANGES` — any blocker or required finding");
    expect(codeReview).toContain("`BLOCKED` — the inspection did not complete");
    expect(codeReview).toContain(
      "never set `ready-to-merge` (or `changes-requested`) from a blocked review"
    );
    expect(codeReview).toContain("keep or set `needs-review`");
  });
});
