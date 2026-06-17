import { describe, expect, it } from "vitest";

import { generateSecret } from "./generate-secret.js";

describe("generateSecret", () => {
  it("generates a 64-character hex string by default", () => {
    const secret = generateSecret();
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates a secret of the requested length", () => {
    const secret = generateSecret(32);
    expect(secret).toMatch(/^[a-f0-9]{32}$/);
  });

  it("produces different values on successive calls", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
  });
});
