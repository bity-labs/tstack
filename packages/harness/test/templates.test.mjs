import { test } from "node:test";
import assert from "node:assert/strict";
import { lstatSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const template = (...parts) =>
  join(fileURLToPath(new URL(".", import.meta.url)), "..", "templates", "default", ...parts);

const frontmatter = (path) => {
  const body = readFileSync(path, "utf8");
  const match = body.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, `${path} has frontmatter`);
  return Object.fromEntries(
    match[1]
      .split("\n")
      .filter((line) => /^[\w-]+:/.test(line))
      .map((line) => {
        const index = line.indexOf(":");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
};

test("harness skills referenced by the configuration are available", () => {
  for (const name of [
    "code-review",
    "publish-review",
    "implement-with-tdd",
    "understand-codebase",
    "debug",
    "refactor-safely",
    "fix-code-review"
  ]) {
    const path = template(".agents", "skills", name, "SKILL.md");
    const meta = frontmatter(path);
    assert.equal(meta.name, name, `${path} declares its name`);
    assert.ok(meta.description?.length > 0, `${path} declares a description`);
  }
});

test("packaged skill and settings files are real files, not symlinks", () => {
  for (const path of [
    template(".agents", "skills", "code-review", "SKILL.md"),
    template(".agents", "skills", "publish-review", "SKILL.md"),
    template(".pi", "settings.example.json")
  ]) {
    const stats = lstatSync(path);
    assert.equal(stats.isFile(), true, path);
    assert.equal(stats.isSymbolicLink(), false, path);
  }
});

test("code-review stays inspection-only", () => {
  const body = readFileSync(template(".agents", "skills", "code-review", "SKILL.md"), "utf8");
  for (const forbidden of ["gh pr comment", "gh pr edit", "gh label"]) {
    assert.equal(body.includes(forbidden), false, `code-review must not use ${forbidden}`);
  }
  assert.match(body, /## Verdict/);
});

test("settings example maps roles to harness skills without replacing builtin prompts or models", () => {
  const settings = JSON.parse(readFileSync(template(".pi", "settings.example.json"), "utf8"));
  const overrides = settings.subagents.agentOverrides;

  assert.deepEqual(overrides.worker.skills, ["implement-with-tdd"]);
  assert.deepEqual(overrides.reviewer.skills, ["code-review"]);
  assert.deepEqual(overrides.delegate.skills, ["publish-review"]);
  assert.deepEqual(overrides.scout.skills, ["understand-codebase"]);

  assert.deepEqual([...overrides.delegate.tools].sort(), [
    "bash",
    "contact_supervisor",
    "find",
    "grep",
    "ls",
    "read"
  ]);

  for (const [name, override] of Object.entries(overrides)) {
    for (const field of ["model", "systemPrompt", "systemPromptMode"]) {
      assert.equal(
        override[field],
        undefined,
        `${name} override must not set ${field}`
      );
    }
  }
});
