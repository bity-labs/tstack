# MCP server

A local stdio Model Context Protocol server using the official TypeScript SDK and Effect. It calls the API through `@tstack/sdk`; it does not import backend implementation or open SQLite.

## Commands

From the boilerplate root (`packages/boilerplate` when developing inside TStack):

```sh
pnpm --filter @tstack/mcp build
pnpm --filter @tstack/mcp typecheck
pnpm --filter @tstack/mcp lint
pnpm --filter @tstack/mcp test
```

For an MCP client, configure the executable as `node`, arguments as `["--import", "tsx", "src/main.ts"]`, and working directory as the absolute path to `apps/mcp`. Install dependencies first. `API_URL` defaults to `http://127.0.0.1:4000`; set it in the MCP client's environment. The API must be running. Do not use a command runner that writes banners to stdout: this stream is reserved for JSON-RPC. Startup errors go to stderr.

## Tool

`src/tools/api-health.tool.ts` owns tool registration and its SDK adapter; `src/server.ts` composes tools and `src/main.ts` starts stdio. Add each future tool in its own kebab-case `.tool.ts` module; keep protocol transport separate from business implementation.

`api_health` takes no input, calls the generated health operation and returns structured status/storage data. API failures become MCP tool errors without backend details. Requests respect client cancellation and have a five-second timeout. The tool is read-only; annotations describe this but do not enforce permissions.

The Vitest integration test starts a real stdio MCP process, discovers the tool with the official client and checks HTTP success and failure through the SDK. No public HTTP transport, authentication, writes or automatic exposure of all API operations is included. Add tools deliberately when business operations exist; do not turn every endpoint into a tool by default.
