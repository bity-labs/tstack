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
    expect(reviewer.systemPrompt).toContain("gh api REST fallback");

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

  it("consolidates inspection, verdict mapping, and publication in code-review", () => {
    // One review skill for interactive use and reviewer subagents; the
    // two-skill split was withdrawn. This pins the documented contract, not
    // runtime model compliance.
    const codeReview = readTemplate("default/.agents/skills/code-review/SKILL.md");
    expect(codeReview).toMatch(/^name: code-review$/m);
    expect(codeReview).toContain("Load doctrine before the diff");
    expect(codeReview).toContain("required");
    expect(codeReview).toContain("## 9. Report Back");
    expect(codeReview).toContain("gh pr comment");
    expect(codeReview).toContain("never edit, stage, commit, or push source changes");
    // R5: ordinary PR-URL workflow is executable without a write tool —
    // self-service pinned read-only diffs and direct stdin publication.
    expect(codeReview).toContain("gh pr diff");
    expect(codeReview).toContain("not a\nprerequisite");
    expect(codeReview).toContain("--body-file - <<'REVIEW_EOF'");
    // Documented minimal REST fallback for the installed gh pr edit
    // projectCards failure; unrelated labels stay intact by construction.
    expect(codeReview).toContain(
      "gh api repos/<owner>/<repo>/issues/<PR_NUMBER>/labels -X POST -F labels[]=changes-requested"
    );
    expect(codeReview).toContain(
      "gh api repos/<owner>/<repo>/issues/<PR_NUMBER>/labels/needs-review -X DELETE"
    );
    expect(existsSync(templatePath("default/.agents/skills/review-change")), "review-change").toBe(
      false
    );
  });

  it("fails closed on required findings and blocked reviews (documented contract)", () => {
    // R4: static contract guard for the review semantics — required findings
    // are mandatory before merge/acceptance, and a blocked inspection never
    // resolves to a terminal PR state. This pins the documented wording, not
    // runtime model compliance.
    const normalize = (text: string): string => text.replace(/\s+/g, " ");
    const codeReview = normalize(readTemplate("default/.agents/skills/code-review/SKILL.md"));
    expect(codeReview).toContain(
      "before merge/acceptance; lower severity than a blocker, but never optional"
    );
    expect(codeReview).toContain(
      "`APPROVE` — no unresolved blockers or required findings and adequate"
    );
    expect(codeReview).toContain("`CHANGES` — any blocker or required finding");
    expect(codeReview).toContain("`BLOCKED` — the review could not finish");
    expect(codeReview).toContain(
      "never set `ready-to-merge` (or `changes-requested`) from a blocked review"
    );
    expect(codeReview).toContain("keep or set `needs-review`");
  });
});
