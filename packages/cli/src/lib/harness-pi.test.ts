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
  systemPromptMode?: "append" | "replace";
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

  it("configures the scout strictly read-only and the reviewer as a policy-bounded publisher", () => {
    const overrides = readOverrides();

    // Scout: strict read-only tool boundary, no shell.
    const scout = overrides.scout;
    expect(scout.acceptanceRole).toBe("read-only");
    expect(scout.defaultContext).toBe("fresh");
    expect(scout.tools).toEqual(
      expect.arrayContaining(["read", "grep", "find", "ls", "contact_supervisor"])
    );
    for (const forbidden of ["bash", "edit", "write", "subagent"]) {
      expect(scout.tools).not.toContain(forbidden);
    }
    expect(scout.model).toBeUndefined();
    expect(scout.systemPrompt).toBeUndefined();
    expect(scout.inheritProjectContext).toBe(true);
    expect(scout.inheritSkills).toBe(false);
    expect(scout.skills).toEqual(["understand-codebase"]);

    // Reviewer: bash is required for inspection and normal gh publication
    // through the code-review skill; edit/write stay unavailable and the
    // no-source-mutation rule is a composed-prompt policy, not enforced
    // filesystem isolation.
    const reviewer = overrides.reviewer;
    expect(reviewer.acceptanceRole).toBe("read-only");
    expect(reviewer.defaultContext).toBe("fresh");
    expect(reviewer.tools).toEqual(
      expect.arrayContaining([
        "read",
        "grep",
        "find",
        "ls",
        "bash",
        "watchdog_diff",
        "contact_supervisor"
      ])
    );
    for (const forbidden of ["edit", "write", "subagent"]) {
      expect(reviewer.tools).not.toContain(forbidden);
    }
    expect(reviewer.model).toBeUndefined();
    expect(reviewer.inheritProjectContext).toBe(true);
    expect(reviewer.inheritSkills).toBe(false);
    // The composed prompt must not keep the builtin reviewer's shell
    // prohibition, and it must state the policy boundary truthfully.
    expect(reviewer.systemPromptMode).toBe("append");
    expect(reviewer.systemPrompt).toBeDefined();
    expect(reviewer.systemPrompt).not.toContain("Do not use shell commands");
    expect(reviewer.systemPrompt).toContain("not an enforced filesystem restriction");
    expect(reviewer.systemPrompt).toContain("Never edit, stage, commit, or push source changes");
    // R5: the prompt permits self-service diffs and the equivalent REST label
    // commands instead of restricting the reviewer to known-failing gh pr edit.
    expect(reviewer.systemPrompt).toContain("gh pr diff");
    expect(reviewer.systemPrompt).toContain("gh api label fallback");

    // Fresh reviewers receive the review workflow through this override, not
    // per-launch selection; every configured skill resolves on disk.
    expect(reviewer.skills).toEqual(["code-review"]);
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

  it("keeps code-review generic and near its original size with the review contract", () => {
    // The operator restored the original skill as the foundation; the generic
    // skill carries only the review contract, while Pi/controller/tool
    // mechanics live in the reviewer configuration and /autoshift. Static
    // contract guard, not a runtime-compliance claim.
    const codeReview = readTemplate("default/.agents/skills/code-review/SKILL.md");
    expect(codeReview.split("\n").length).toBeLessThanOrEqual(190);
    expect(codeReview).toMatch(/^name: code-review$/m);
    expect(codeReview).toContain("Load Doctrine Before the Diff");
    expect(codeReview).toContain("### 9. Report Back");

    // The three behavioral additions survive the simplification.
    expect(codeReview).toContain("never edits code and never merges");
    expect(codeReview).toContain("Never edit code as part of the review, and never merge");
    expect(codeReview).toContain("keep `needs-review`, report the missing evidence");
    expect(codeReview).toContain("never imply approval or resolve to a terminal status");
    expect(codeReview).toContain("the published comment URL and the review verdict");
    // Prior functional fixes kept as one short note: literal stdin
    // publication and the gh api label fallback with unrelated labels intact.
    expect(codeReview).toContain("--body-file -");
    expect(codeReview).toContain("quoted heredoc delimiter");
    expect(codeReview).toContain("gh api` issue-labels endpoints");
    expect(codeReview).toContain("unrelated labels stay intact");

    // No Pi/controller/tool/isolation mechanics duplicated into the generic
    // skill; those belong to the reviewer configuration and /autoshift.
    expect(codeReview).not.toContain("watchdog_diff");
    expect(codeReview).not.toContain("controller");
    expect(codeReview).not.toContain("filesystem");
    expect(existsSync(templatePath("default/.agents/skills/review-change")), "review-change").toBe(
      false
    );
  });

  it("fails closed on required findings and blocked reviews (documented contract)", () => {
    // Fail-closed review semantics preserved in the shortened step 7:
    // findings before merge are never optional, and an incomplete review
    // keeps needs-review instead of resolving to a terminal state. Static
    // contract guard, not runtime model compliance.
    const normalize = (text: string): string => text.replace(/\s+/g, " ");
    const codeReview = normalize(readTemplate("default/.agents/skills/code-review/SKILL.md"));
    expect(codeReview).toContain("none of these findings is optional");
    expect(codeReview).toContain(
      "use only when the review accepts the PR as merge-ready and validation evidence is adequate"
    );
    expect(codeReview).toContain("never imply approval or resolve to a terminal status");
  });
});
