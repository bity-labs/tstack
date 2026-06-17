import { describe, expect, it } from "vitest";

import { generateEnv } from "./env.js";

describe("generateEnv", () => {
  it("generates .env content from .env.example with replacements", () => {
    const example = `
NEXT_PUBLIC_APP_NAME=MyApp
DATABASE_URL=postgresql://myapp:myapp-dev-password@localhost:5432/myapp
BETTER_AUTH_SECRET=
POLAR_ACCESS_TOKEN=xxxxx
`.trim();

    const result = generateEnv({
      exampleContent: example,
      values: {
        NEXT_PUBLIC_APP_NAME: "Acme",
        DATABASE_URL: "postgresql://acme:acme-dev-password@localhost:5432/acme",
        BETTER_AUTH_SECRET: "secret123",
      },
    });

    expect(result).toContain("NEXT_PUBLIC_APP_NAME=Acme");
    expect(result).toContain("DATABASE_URL=postgresql://acme:acme-dev-password@localhost:5432/acme");
    expect(result).toContain("BETTER_AUTH_SECRET=secret123");
    expect(result).toContain("POLAR_ACCESS_TOKEN=xxxxx");
  });

  it("preserves comments and blank lines", () => {
    const example = `# Project Configuration\nPROJECT_URL=http://localhost:3000\n\n# Database\nDATABASE_URL=postgresql://myapp:myapp-dev-password@localhost:5432/myapp`;

    const result = generateEnv({
      exampleContent: example,
      values: {},
    });

    expect(result).toContain("# Project Configuration");
    expect(result).toContain("# Database");
    expect(result).toContain("PROJECT_URL=http://localhost:3000");
  });

  it("replaces values that exist in the example", () => {
    const example = `FOO=bar\nBAZ=qux`;
    const result = generateEnv({
      exampleContent: example,
      values: { FOO: "updated" },
    });
    expect(result).toContain("FOO=updated");
    expect(result).toContain("BAZ=qux");
  });

  it("handles empty values", () => {
    const example = `EMPTY=\nFILLED=value`;
    const result = generateEnv({
      exampleContent: example,
      values: { EMPTY: "now-filled" },
    });
    expect(result).toContain("EMPTY=now-filled");
    expect(result).toContain("FILLED=value");
  });
});
