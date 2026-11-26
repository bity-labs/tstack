import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { ApiError, health } from '../src/index';

const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/unavailable/health') {
    res.writeHead(503).end(
      JSON.stringify({
        _tag: 'StorageUnavailable',
        message: 'Storage is unavailable',
      }),
    );
  } else {
    res.end(JSON.stringify({ status: 'ok', storage: 'sqlite' }));
  }
});
let baseUrl: string;
beforeAll(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing server address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);

it('decodes the generated health operation over HTTP', async () => {
  await expect(health({ baseUrl })).resolves.toEqual({
    status: 'ok',
    storage: 'sqlite',
  });
});

it('uses a portable custom fetch callable for generated operations', async () => {
  const transport = async (input: RequestInfo | URL, init?: RequestInit) => {
    expect(String(input)).toBe('http://api.internal/health');
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('include');
    expect(init?.cache).toBe('no-store');
    expect(new Headers(init?.headers).get('cookie')).toBe('session=bound');
    expect(init).not.toHaveProperty('fetch');
    expect(init).not.toHaveProperty('baseUrl');
    return Response.json({ status: 'ok', storage: 'd1' });
  };
  await expect(
    health({
      baseUrl: 'http://api.internal/',
      fetch: transport,
      headers: { cookie: 'session=bound' },
      cache: 'no-store',
    }),
  ).resolves.toEqual({ status: 'ok', storage: 'd1' });
});

it('rejects HTTP errors so query consumers do not treat them as success', async () => {
  const result = health({ baseUrl: `${baseUrl}/unavailable` });
  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({
    status: 503,
    data: { _tag: 'StorageUnavailable' },
  });
});
