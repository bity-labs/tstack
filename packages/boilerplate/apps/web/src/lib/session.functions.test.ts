// @vitest-environment node
import { AsyncLocalStorage } from 'node:async_hooks';
import { createServer } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { withApiRuntime } from './api-runtime.server';
import { getCurrentUser } from './session.functions';

const framework = vi.hoisted(() => ({
  getRequestHeaders: vi.fn(),
  setResponseHeader: vi.fn(),
}));

// Only the framework's request-context boundary is substituted. The generated
// me() function, SDK transport, and request-scoped runtime are real.
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    handler: (handle: () => Promise<unknown>) => handle,
  }),
}));
vi.mock('@tanstack/react-start/server', () => framework);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it('uses the generated me client over the current binding and forwards each SSR cookie privately', async () => {
  const requests = new AsyncLocalStorage<string>();
  framework.getRequestHeaders.mockImplementation(
    () => new Headers({ cookie: `session=${requests.getStore()}` }),
  );
  const binding = (id: string) => ({
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      expect(String(input)).toBe('http://api.internal/me');
      expect(init?.method).toBe('GET');
      expect(init?.cache).toBe('no-store');
      expect(init?.credentials).toBe('include');
      expect(new Headers(init?.headers).get('cookie')).toBe(`session=${id}`);
      await Promise.resolve();
      return Response.json({
        id,
        name: id,
        email: `${id}@example.com`,
        emailVerified: false,
      });
    },
  });
  const network = vi
    .spyOn(globalThis, 'fetch')
    .mockRejectedValue(
      new Error('Unexpected HTTP transport for a binding request'),
    );
  const currentUser = (id: string) =>
    requests.run(id, () =>
      withApiRuntime({ API: binding(id) }, () => getCurrentUser()),
    );
  const [alice, bob] = await Promise.all([
    currentUser('alice'),
    currentUser('bob'),
  ]);
  expect(alice?.id).toBe('alice');
  expect(bob?.id).toBe('bob');
  expect(framework.setResponseHeader).toHaveBeenCalledWith(
    'cache-control',
    'private, no-store',
  );
  expect(network).not.toHaveBeenCalled();
});

it('uses the generated me client over HTTP and isolates concurrent SSR cookies', async () => {
  const requests = new AsyncLocalStorage<string>();
  framework.getRequestHeaders.mockImplementation(
    () => new Headers({ cookie: `session=${requests.getStore()}` }),
  );
  const server = createServer(async (request, response) => {
    expect(request.url).toBe('/me');
    expect(request.method).toBe('GET');
    expect(request.headers['cache-control']).toBe('no-cache');
    await Promise.resolve();
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ id: request.headers.cookie?.slice(8) }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing test server address');
  vi.stubEnv('API_URL', `http://127.0.0.1:${address.port}`);
  try {
    const [alice, bob] = await Promise.all([
      requests.run('alice', () => getCurrentUser()),
      requests.run('bob', () => getCurrentUser()),
    ]);
    expect(alice?.id).toBe('alice');
    expect(bob?.id).toBe('bob');
    expect(framework.setResponseHeader).toHaveBeenCalledWith(
      'cache-control',
      'private, no-store',
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

it('distinguishes anonymous HTTP sessions from API failures', async () => {
  const server = createServer((request, response) => {
    expect(request.url).toBe('/me');
    const cookie = request.headers.cookie;
    response.writeHead(cookie === 'session=valid' ? 200 : cookie ? 503 : 401, {
      'content-type': 'application/json',
    });
    response.end(
      JSON.stringify(
        cookie === 'session=valid'
          ? { id: 'vm-user' }
          : { error: 'unavailable' },
      ),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing test server address');
  vi.stubEnv('API_URL', `http://127.0.0.1:${address.port}`);
  try {
    framework.getRequestHeaders.mockReturnValue(
      new Headers({ cookie: 'session=valid' }),
    );
    expect(await getCurrentUser()).toEqual({ id: 'vm-user' });
    framework.getRequestHeaders.mockReturnValue(new Headers());
    expect(await getCurrentUser()).toBeNull();
    framework.getRequestHeaders.mockReturnValue(
      new Headers({ cookie: 'session=outage' }),
    );
    await expect(getCurrentUser()).rejects.toThrow(
      'Unable to verify your session. Please try again.',
    );
    expect(framework.setResponseHeader).toHaveBeenCalledWith(
      'cache-control',
      'private, no-store',
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
