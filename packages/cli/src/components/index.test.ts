import { describe, expect, it } from "vitest";

import * as components from "./index.js";

const requiredComponentExports = [
  "TextInput",
  "Confirm",
  "Select",
  "MultiSelect",
  "Spinner",
  "StatusMessage",
  "SectionHeader",
  "Header",
  "CompletedSteps",
  "ProductList",
  "OperationMenu",
  "ErrorRecovery",
] as const;

describe("shared CLI component exports", () => {
  it("makes the shared TStack CLI components available from packages/cli/src/components", () => {
    for (const exportName of requiredComponentExports) {
      expect(components[exportName]).toBeTypeOf("function");
    }
  });
});
