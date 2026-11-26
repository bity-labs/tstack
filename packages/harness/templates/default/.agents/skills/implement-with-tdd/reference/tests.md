# Test quality

Test observable behavior through the stable interface a caller uses: returned values, persisted state, emitted events, and externally visible effects. Prefer a real integration across owned modules to assertions on private helpers, internal call order, or incidental formatting. A valid internal refactor should not require rewriting the test.

## Choose discriminating cases

- Name the behavior and the plausible mistake the test must detect. Choose inputs where the correct result differs from that mistake, including both sides of a boundary when relevant.
- Derive expected values independently of the implementation. Assert the outcome, not just that execution did not crash.
- Cover the important success, invalid-input, authorization, retry and failure paths of the change. Add a regression for a confirmed bug when a stable seam reaches the real failing pattern; document when it cannot.
- Keep fixtures small and meaningful, and test names clear about setup, action and expected behavior. Prefer a focused case over a large suite that repeatedly exercises the same easy path.
- Control clocks, randomness, network, filesystem and shared state when they would make outcomes nondeterministic. Do not replace the collaboration under test with a mock.

## Characterization and review

Characterization records current behavior before a risky refactor, including surprising behavior that must be preserved. Establish a passing baseline before structural changes; it is not a reason to force a red test or silently change the contract.

When reviewing tests, ask what plausible regression would fail each assertion and what important path remains unverified. Distinguish native/provider behavior proven by a real integration from behavior simulated by test doubles. Report missing coverage without claiming that mocks or bundling establish runtime behavior.
