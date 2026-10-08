#!/usr/bin/env node

/**
 * Aggregate `PR validation` merge-gate decision.
 *
 * Reads the concrete GitHub Actions job results and the affected-workspace
 * selection via environment variables and prints the aggregate conclusion.
 *
 * Environment contract:
 * - GPR_DETECT_RESULT: result of the detection job.
 * - GPR_VALIDATE_RESULT: result of the application-checks job (may be skipped).
 * - GPR_FORMAT_RESULT: result of the repository formatting job.
 * - GPR_SELECTION: JSON array of runnable workspaces selected for checks.
 * - GPR_MACHINERY_APPLICABLE: "true" when the validation machinery changed and
 *   its own test suites became an applicable check (GPR_MACHINERY_RESULT).
 * - GPR_MACHINERY_RESULT: result of the machinery self-tests job (skipped when
 *   not applicable).
 *
 * A gate result other than success, a selection with expected-but-skipped
 * checks, and empty unexpected results all fail the gate. An explicit
 * no-application-checks conclusion is reported when no checks were needed.
 */

const JOB_LABELS = {
  GPR_DETECT_RESULT: "detection",
  GPR_FORMAT_RESULT: "repository formatting"
};

export function runGate(env) {
  const failedJobs = [];
  for (const [variable, label] of Object.entries(JOB_LABELS)) {
    const result = env[variable];
    if (result !== "success") failedJobs.push(`${label}: ${result ?? "unknown"}`);
  }
  if (failedJobs.length > 0) {
    const lines = [`PR validation failed — non-success job results (${failedJobs.join("; ")})`];
    return { ok: false, message: lines[0] };
  }

  const machineryApplicable = env.GPR_MACHINERY_APPLICABLE === "true";
  if (machineryApplicable && env.GPR_MACHINERY_RESULT !== "success") {
    return {
      ok: false,
      message: `PR validation failed — validation machinery checks reported ${env.GPR_MACHINERY_RESULT ?? "unknown"}`
    };
  }

  const selection = parseSelection(env.GPR_SELECTION);
  if (selection === undefined) {
    return {
      ok: false,
      message: "PR validation failed — detection produced no parsable workspace selection"
    };
  }
  if (selection.length === 0) {
    // No workspace checks were required; the checks job skips by design.
    const checksResult = env.GPR_VALIDATE_RESULT;
    if (checksResult === undefined || checksResult === "skipped" || checksResult === "success") {
      if (machineryApplicable) {
        return {
          ok: true,
          message:
            "PR validation passed — validation machinery self-tests verified; no workspace application checks were applicable and repository formatting passed"
        };
      }
      return {
        ok: true,
        message:
          "PR validation passed — no application checks were applicable; repository formatting verified"
      };
    }
    return {
      ok: false,
      message: `PR validation failed — no application checks were applicable but the checks job reported ${checksResult}`
    };
  }
  if (env.GPR_VALIDATE_RESULT !== undefined && env.GPR_VALIDATE_RESULT !== "success") {
    return {
      ok: false,
      message: `PR validation failed — application checks were required but reported ${env.GPR_VALIDATE_RESULT}`
    };
  }
  return {
    ok: true,
    message: `PR validation passed — application checks verified for: ${selection.join(", ")}${
      machineryApplicable ? ", plus validation machinery self-tests" : ""
    }`
  };
}

function parseSelection(raw) {
  try {
    const parsed = JSON.parse(raw ?? "null");
    if (!Array.isArray(parsed)) return undefined;
    return parsed.map((entry) => String(entry));
  } catch {
    return undefined;
  }
}

if (process.argv[1] && process.argv[1].endsWith("gate.mjs")) {
  const outcome = runGate(process.env);
  console.log(outcome.message);
  process.exit(outcome.ok ? 0 : 1);
}
