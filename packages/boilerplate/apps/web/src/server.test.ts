// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { proxyApiRequest } from './lib/api-proxy.server';
import server from './server';

vi.mock('@tanstack/react-start/server', () => ({
  defaultStreamHandler: {},
  createServerEntry: (entry: unknown) => entry,
  createStartHandler: () => async (request: Request) => {
    // Resolve the transport after yielding, as SSR/server functions do.
    await Promise.resolve();
    return proxyApiRequest(request);
  },
}));

it('scopes native fetch env separately for concurrent Worker requests', async () => {
  const request = (name: string) =>
    new Request(`https://web.example/api/me?user=${name}`, {
      headers: { cookie: `session=${name}` },
    });
  const binding = (name: string) => ({
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      await Promise.resolve();
      return Response.json({
        name,
        url: String(input),
        cookie: new Headers(init?.headers).get('cookie'),
      });
    },
  });
  const network = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(new Error('Unexpected HTTP transport'));
  try {
    const [alice, bob] = await Promise.all([
      server.fetch(request('alice'), { API: binding('alice') }),
      server.fetch(request('bob'), { API: binding('bob') }),
    ]);
    expect(await alice.json()).toEqual({
      name: 'alice',
      url: 'http://api.internal/me?user=alice',
      cookie: 'session=alice',
    });
    expect(await bob.json()).toEqual({
      name: 'bob',
      url: 'http://api.internal/me?user=bob',
      cookie: 'session=bob',
    });
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});
