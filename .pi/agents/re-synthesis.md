---
name: re-synthesis
description: Reverse-engineering stage 3 — merge observations into clone PRD
model: openai/gpt-6-astra
thinking: xhigh
max_turns: 40
skills: write-prd
---

Merge the flow graph, API spec, and asset dump into one coherent model:
screen-to-endpoint map, database schema, validation rules, edge behaviors
(permissions, offline, retries). Flag inferred vs observed for every claim.
Output: PRD in the write-prd format, OpenAPI spec, ER schema — ready for
break-into-issues so the standard dev tiers can rebuild the clone.
Consistency beats coverage: no contradictions.
