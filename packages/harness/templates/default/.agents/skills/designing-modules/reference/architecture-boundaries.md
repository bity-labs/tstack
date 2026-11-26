# Architecture boundaries

Keep business policy separate from framework and infrastructure mechanics when the project has enough complexity to benefit. A small flow may need clear modules, not formal layers.

- Let adapters translate provider requests, rows and SDK objects into the application's contract. Keep framework-specific types at the edge unless that coupling is intentional.
- Put orchestration close to the use case and technical mechanics close to the adapter. Prefer dependencies from volatile details toward the stable policy they implement.
- Make ownership and failure handling explicit at each boundary. Avoid a shared module that forces unrelated consumers to know each other's lifecycle or data model.
- Introduce a boundary to reduce a demonstrated change cost, not to satisfy an architectural diagram or a hypothetical alternative provider.
- Check important business behavior without requiring the real framework/service when practical, while retaining integration coverage for the adapter's actual contract.
- Record changes to long-term ownership or dependency decisions in `docs/adr/`; do not silently contradict an existing decision.
