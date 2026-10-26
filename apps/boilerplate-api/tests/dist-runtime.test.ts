import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, it, assert } from "vitest";

// The API contract must hold for the compiled JavaScript started with plain
// Node, not just for source run through tsx. This suite builds the emit
// configuration, starts `node dist/main.js` on an ephemeral port, and probes
// the resulting HTTP server.

const workspace = path.resolve(import.meta.dirname, "..");
const distEntry = path.join(workspace, "dist", "main.js");

const waitForPort = (port: number, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const attempt = (deadline: number): void => {
      const socket = net.createConnection(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`dist server did not open port ${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(() => attempt(deadline), 100);
        }
      });
    };
    attempt(Date.now() + timeoutMs);
  });

const acquirePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : undefined;
      server.close(() => {
        if (port === undefined) reject(new Error("failed to acquire a port"));
        else resolve(port);
      });
    });
  });

describe("compiled dist runtime (node dist/main.js)", () => {
  let child: ChildProcess | undefined;
  let port: number | undefined;

  beforeAll(async () => {
    assert.match(process.version, /^v24\./, "the API targets Node.js 24");
    const tsc = spawnSync(
      process.execPath,
      ["node_modules/typescript/bin/tsc", "-p", "tsconfig.build.json"],
      {
        cwd: workspace,
        encoding: "utf8",
        timeout: 120_000
      }
    );
    tsc.stderr = tsc.stderr ?? "";
    assert.strictEqual(tsc.status, 0, `tsc build failed:\n${tsc.stderr}`);
    assert.isTrue(existsSync(distEntry), "build must emit dist/main.js");
    // The build compiles application code only; test files never enter dist.
    assert.isFalse(existsSync(path.join(workspace, "dist", "health.test.js")));

    port = await acquirePort();
    child = spawn(process.execPath, ["dist/main.js"], {
      cwd: workspace,
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "ignore", "pipe"]
    });
    assert.isDefined(child);
    child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    await waitForPort(port, 10_000);
  }, 150_000);

  afterAll(() => {
    child?.kill();
  });

  it('serves GET /health with HTTP 200 and body {"status":"ok"}', async () => {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.strictEqual(response.status, 200);
    const body: unknown = await response.json();
    assert.deepStrictEqual(body, { status: "ok" });
  });

  it("serves the OpenAPI description at /openapi.json", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/openapi.json`);
    assert.strictEqual(response.status, 200);
    const spec = (await response.json()) as { paths: { ["/health"]: { get: object } } };
    assert.isDefined(spec.paths["/health"]?.get);
  });
});
