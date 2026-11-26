import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { Config, Effect } from 'effect';
import { createMcpServer } from './server.js';

const program = Effect.gen(function* () {
  const baseUrl = yield* Config.String('API_URL').pipe(
    Config.withDefault('http://127.0.0.1:4000'),
  );
  yield* Effect.tryPromise(() =>
    createMcpServer(baseUrl).connect(new StdioServerTransport()),
  );
});

// Standard output belongs exclusively to the MCP JSON-RPC transport.
Effect.runPromise(program).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
