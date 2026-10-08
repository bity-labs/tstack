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
 *
 * A gate result other than success, a selection with expected-but-skipped
 * checks, and empty unexpected results all fail the gate. An explicit
 * no-application-checks conclusion is reported when no checks were needed.
 */

const JOB_LABELS = {
  GPR_DETECT_RESULT: "detection",
  GPR_VALIDATE_RESULT: "application checks",
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

  const selection = parseSelection(env.GPR_SELECTION);
  if (selection === undefined) {
    return {
      ok: false,
      message: "PR validation failed — detection produced no parsable workspace selection"
    };
  }
  if (selection.length === 0) {
    return {
      ok: true,
      message:
        "PR validation passed — no application checks were applicable; repository formatting verified"
    };
  }
  return {
    ok: true,
    message: `PR validation passed — application checks verified for: ${selection.join(", ")}`
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
