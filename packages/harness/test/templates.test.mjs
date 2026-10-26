import { test } from "node:test";
import assert from "node:assert/strict";
import { lstatSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const template = (...parts) =>
  join(fileURLToPath(new URL(".", import.meta.url)), "..", "templates", "default", ...parts);

/**
 * Scalar-level frontmatter check: quoted values must terminate properly and
 * unquoted values must not contain `: ` (which breaks YAML compact mappings).
 * This catches frontmatter that the real parser would reject without being a
 * full YAML implementation.
 */
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
        const key = line.slice(0, index).trim();
        let value = line.slice(index + 1).trim();
        let quoted = false;
        for (const quote of ["'", "'"]) {
          if (value.startsWith(quote)) {
            quoted = true;
            assert.ok(
              value.endsWith(quote) && (quote !== "'" || !value.slice(1, -1).match(/(?<!')'(?!')/)),
              `${path}: ${key} has a properly closed ${quote}-quoted value`
            );
            value = value.slice(1, -1).replaceAll(quote + quote, quote);
            break;
          }
        }
        if (!quoted) {
          assert.equal(
            value.includes(": "),
            false,
            `${path}: ${key} is quoted or free of ": " so YAML cannot see a nested mapping`
          );
        }
        return [key, value];
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

test("code-review stays inspection-only on the native reviewer contract", () => {
  const body = readFileSync(template(".agents", "skills", "code-review", "SKILL.md"), "utf8");
  for (const forbidden of ["gh pr comment", "gh pr edit", "gh label"]) {
    assert.equal(body.includes(forbidden), false, `code-review must not use ${forbidden}`);
  }
  for (const native of ["P0", "BLOCK", "OK with notes"]) {
    assert.ok(body.includes(native), `code-review uses the native ${native} contract`);
  }
  for (const label of ["ready-to-merge", "changes-requested"]) {
    assert.equal(body.includes(label), false, `status labels belong to publish-review, not ${label}`);
  }
});

test("publish-review holds GitHub formatting, translation, and identity checks", () => {
  const body = readFileSync(template(".agents", "skills", "publish-review", "SKILL.md"), "utf8");
  assert.match(body, /## Summary/);
  assert.match(body, /## Verdict/);
  assert.ok(body.includes("headRefOid,baseRefOid,baseRefName"), "checks head, base, and branch");
  assert.ok(body.includes("--paginate"), "searches comments across all pages");
  assert.ok(body.includes("labels/"), "uses issue-label endpoints");
  assert.equal(body.includes("-X PUT"), false, "no issue-update PUT fallback");
  for (const verdict of ["BLOCK", "OK with notes", "ready-to-merge", "changes-requested"]) {
    assert.ok(body.includes(verdict), `translates ${verdict}`);
  }
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
