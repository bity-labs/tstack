// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest';
import { getApiTransport, withApiRuntime } from './api-runtime.server';

afterEach(() => vi.unstubAllEnvs());

it('uses request-scoped local HTTP configuration before process configuration', () => {
  vi.stubEnv('API_URL', 'http://127.0.0.1:4443');
  expect(getApiTransport().baseUrl).toBe('http://127.0.0.1:4443');
  withApiRuntime({ API_URL: 'http://127.0.0.1:4444' }, () => {
    expect(getApiTransport().baseUrl).toBe('http://127.0.0.1:4444');
    expect(getApiTransport().fetch).toBe(globalThis.fetch);
  });
  expect(getApiTransport().baseUrl).toBe('http://127.0.0.1:4443');
  vi.stubEnv('API_URL', undefined);
  expect(getApiTransport().baseUrl).toBe('http://127.0.0.1:4000');
});

it('requires the native binding in production rather than falling back to HTTP', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('API_URL', 'https://must-not-use.example');
  expect(() => getApiTransport()).toThrow('Missing API service binding');
  expect(() =>
    withApiRuntime({ API_URL: 'https://also-must-not-use.example' }, () =>
      getApiTransport(),
    ),
  ).toThrow('Missing API service binding');
});

it('uses the current service binding with its receiver instead of HTTP', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const binding = {
    name: 'bound-api',
    async fetch(input: RequestInfo | URL) {
      return Response.json({ name: this.name, url: String(input) });
    },
  };
  const network = vi.spyOn(globalThis, 'fetch');
  try {
    const result = await withApiRuntime(
      { API: binding, API_URL: 'https://must-not-use.example' },
      async () => {
        const transport = getApiTransport();
        return transport.fetch(`${transport.baseUrl}/me`);
      },
    );
    expect(await result.json()).toEqual({
      name: 'bound-api',
      url: 'http://api.internal/me',
    });
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});
