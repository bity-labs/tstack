---
name: debug
description: Disciplined debugging loop for hard bugs and performance regressions. Use when the user says something is broken, throwing, failing, or describes a performance regression.
---

# Debug

Find the root cause of a bug or performance regression with evidence, fix it, and add regression coverage.

## Use and Context

Use this workflow to investigate and fix a bug within the authorized task. See [invocation rules](../../invocation.md).

Read `docs/coding-standards.md` for stack constraints and commands before changing code, `docs/context.md` when domain meaning is involved, and relevant ADRs if the suspected cause touches an established decision. Inspect the actual code path, data, logs and recent changes; a plausible explanation is not a confirmed cause.

Load the matching risk guide in `docs/engineering/` when evidence involves security, persisted data or risky untested code. The [risk index](../../../docs/engineering/index.md) routes by risk; it is not an unconditional reading list.

## Workflow

### 1. Build a Feedback Loop

**This is the skill.** Everything else is mechanical. A fast, deterministic, agent-runnable pass/fail signal for the bug makes the rest straightforward. Without one, no amount of staring at code will help.

Spend disproportionate effort here.

Try these in roughly this order:

1. **Failing test** at whatever seam reaches the bug.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) driving the UI.
5. **Replay a captured trace.** Save a real request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system that exercises the bug path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states, automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive them with a structured script so the loop is still organized.

Once you have a loop, sharpen it:

- Can I make it faster? (Cache setup, skip unrelated init, narrow scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)

For non-deterministic bugs, raise the reproduction rate until it is debuggable. Loop the trigger 100×, parallelise, add stress, narrow timing windows. A 50%-flake bug is debuggable; 1% is not.

If you genuinely cannot build a loop, stop and say so. List what you tried. Ask the user for access to the environment, a captured artifact, or permission to add temporary instrumentation.

Do not proceed to Phase 2 until you have a loop you believe in.

### 2. Reproduce

Run the loop. Confirm:

- [ ] The loop produces the failure the **user** described — not a different failure nearby.
- [ ] The failure is reproducible across multiple runs (or at a high enough rate for non-deterministic bugs).
- [ ] You have captured the exact symptom so later phases can verify the fix.

Minimize the input and setup while preserving that symptom. Keep the original case as a control; minimizing must not turn the test into a different failure.

Do not proceed until the bug is reproduced.

### 3. Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If the user is present (HITL), show the ranked list before testing. They may have domain knowledge that re-ranks instantly or know hypotheses already ruled out.
If running unattended (AFK), proceed with your ranking.

### 4. Instrument

Each probe must map to a specific prediction from Phase 3. Change one variable at a time.

Tool preference:

1. **Debugger / REPL inspection** if the env supports it.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

Tag every debug log with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup later becomes a single grep. Untagged logs survive; tagged logs die.

For performance regressions, establish a baseline measurement first, then bisect. Measure first, fix second.

### 5. Fix + Regression Test

Fix the cause supported by the probes, not the first plausible hypothesis. Invoke `implement-with-tdd` for regression coverage and the fix: provide the minimized reproduction, original control and confirmed cause. Its red-green-refactor method owns the test/fix loop; preserve its HITL plan approval. A test must reach the real failing pattern at the call site, not a shallower substitute.

If no stable seam reaches that pattern, document the limitation rather than adding misleading coverage. Invoke `designing-modules` only if resolving that seam is part of the requested scope; otherwise flag it for later. Re-run the Phase 1 loop against the original scenario and affected adjacent behavior after the fix.

### 6. Cleanup + Post-Mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop).
- [ ] Regression test passes (or absence of seam is documented).
- [ ] All `[DEBUG-...]` instrumentation removed.
- [ ] Throwaway prototypes deleted or moved to a clearly-marked debug location.
- [ ] The correct hypothesis is stated in the commit / PR message.

Then ask: what would have prevented this bug? If the answer involves architectural change — no good test seam, tangled callers, hidden coupling — note the specifics for the next improvement cycle.
