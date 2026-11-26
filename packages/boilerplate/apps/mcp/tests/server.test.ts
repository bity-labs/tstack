import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('discovers and invokes the stdio tool, including API failures', async () => {
  let unavailable = false;
  const api = createServer((request, response) => {
    if (request.url !== '/health') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(unavailable ? 503 : 200, {
      'content-type': 'application/json',
    });
    response.end(
      JSON.stringify(
        unavailable
          ? { message: 'private backend details' }
          : { status: 'ok', storage: 'sqlite' },
      ),
    );
  });
  api.listen(0, '127.0.0.1');
  await once(api, 'listening');
  const address = api.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing API test address');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', 'tsx', 'src/main.ts'],
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { API_URL: `http://127.0.0.1:${address.port}` },
  });
  const client = new Client({ name: 'tstack-test', version: '0.0.0' });
  try {
    await client.connect(transport);
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([
      'api_health',
    ]);
    const result = await client.callTool({ name: 'api_health', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      status: 'ok',
      storage: 'sqlite',
    });
    unavailable = true;
    const failure = await client.callTool({
      name: 'api_health',
      arguments: {},
    });
    expect(failure.isError).toBe(true);
    expect(failure.content).toEqual([
      {
        type: 'text',
        text: 'The configured API could not be reached or returned an error.',
      },
    ]);
  } finally {
    await client.close();
    api.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      api.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
