import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:node:child_process";
import { tmpdir } from "node:node:os";
import { join } from "node:path";
import { analyze, computeTransitiveAudit, CLI_USAGE } from "./detect.mjs";

testPlan("detect");
