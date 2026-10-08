import { it, describe } from "node:test";
import assert from "node:assert/strict";
import { runGate } from "./gate.mjs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { env } from "node:process";

const SUCCESS = {
  GPR_DETECT_RESULT: "success",
  GPR_VALIDATE_RESULT: "success",
  GPR_FORMAT_RESULT: "success"
};

describe("runGate", () => {
  it("passes with an explicit no-application-checks conclusion", () => {
    const outcome = runGate({ ...SUCCESS, GPR_SELECTION: "[]" });
    assert.equal(outcome.ok, true);
    assert.match(outcome.message, /no application checks/i);
    assert.match(outcome.message, /formatting/i);
  });

  it("passes and names the successful workspaces", () => {
    const outcome = runGate({
      ...SUCCESS,
      GPR_SELECTION: JSON.stringify(["apps/boilerplate-website"])
    });
    assert.equal(outcome.ok, true);
    assert.match(outcome.message, /apps\/boilerplate-website/);
  });

  it("fails when a job reports failure", () => {
    for (const key of Object.keys(SUCCESS)) {
      const outcome = runGate({ ...SUCCESS, GPR_SELECTION: "[],", [key]: "failure" });
      assert.equal(outcome.ok, false, key);
    }
  });

  it("fails when a required job was cancelled or skipped", () => {
    for (const result of ["cancelled", "skipped"]) {
      const outcome = runGate({ ...SUCCESS, GPR_SELECTION: "[]", GPR_FORMAT_RESULT: result });
      assert.equal(outcome.ok, false, result);
    }
  });

  it("fails when a required application-check leg was skipped unexpectedly", () => {
    const outcome = runGate({
      ...SUCCESS,
      GPR_SELECTION: JSON.stringify(["apps/boilerplate-website"]),
      GPR_VALIDATE_RESULT: "skipped"
    });
    assert.equal(outcome.ok, false);
  });

  it("fails when the selection is not parsable", () => {
    const outcome = runGate({ ...SUCCESS, GPR_SELECTION: "not-json" });
    assert.equal(outcome.ok, false);
  });

  it("exits non-zero from the CLI on failed jobs", () => {
    assert.throws(
      () =>
        execFileSync("node", [join(import.meta.dirname, "gate.mjs")], {
          encoding: "utf8",
          env: {
            ...env,
            GPR_DETECT_RESULT: "success",
            GPR_VALIDATE_RESULT: "failure",
            GPR_FORMAT_RESULT: "success",
            GPR_SELECTION: "[]"
          }
        }),
      (error) => error.status === 1
    );
  });
});
