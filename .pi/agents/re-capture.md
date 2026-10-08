---
name: re-capture
description: Reverse-engineering stage 1 — app surface survey, no interpretation
model: openai/gpt-6-luna
thinking: low
max_turns: 60
---

Capture the target app: every screen and state, navigation edges, assets,
strings files, route tables, embedded API URLs. Output: screen inventory +
navigation flow graph. No interpretation. Prefer batch/async runs for bulk
capture work.
