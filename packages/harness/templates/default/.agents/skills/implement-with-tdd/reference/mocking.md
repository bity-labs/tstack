# Mocking at system boundaries

Use doubles for external services, payment providers, email, queues, clocks, randomness, filesystems or other slow/nondeterministic boundaries when real execution is inappropriate. Do not mock an owned module merely to make the test easy or to assert internal call order.

- Prefer a real isolated dependency or small in-memory fake when it better represents the behavior and failure modes the caller relies on.
- Supply external clients through explicit parameters, constructors or existing adapters rather than patching private functions. Do not add an abstraction unless the boundary needs one.
- Assert the observable result. Check an interaction only when that interaction itself is the contract, such as requesting an external delivery.
- Keep doubles realistic enough to expose integration mistakes, including errors, retries and edge values. A double that always succeeds cannot validate failure handling.
- Complex ordered mocks indicate a seam worth examining. Invoke `designing-modules` if the test requires exposing private state or coordinating many internal calls.

For example, an in-memory email sender can record deliveries and let a test assert the intended recipient and content. Mocking three private helper modules and asserting their sequence freezes implementation instead. State what the fake does not establish about the real provider.
