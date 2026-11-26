// @vitest-environment node
import { createServer } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { proxyApiRequest } from './api-proxy.server';
import { withApiRuntime } from './api-runtime.server';

afterEach(() => vi.unstubAllEnvs());

it('relays auth cookies, redirect, query and body through the service binding', async () => {
  const binding = {
    async fetch(input: RequestInfo | URL, init?: RequestInit) {
      expect(String(input)).toBe(
        'http://api.internal/api/auth/sign-in/email?next=account',
      );
      expect(init?.method).toBe('POST');
      expect(init?.redirect).toBe('manual');
      const headers = new Headers(init?.headers);
      expect(headers.get('cookie')).toBe('session=bound');
      expect(headers.get('origin')).toBe('https://web.example');
      expect(headers.get('authorization')).toBeNull();
      expect(headers.get('cf-connecting-ip')).toBe('203.0.113.8');
      expect(headers.get('x-forwarded-for')).toBeNull();
      expect(new TextDecoder().decode(init?.body as ArrayBuffer)).toBe(
        '{"email":"a@example.com"}',
      );
      const responseHeaders = new Headers({
        location: '/account',
        'content-encoding': 'gzip',
        'content-length': '999',
        'transfer-encoding': 'chunked',
      });
      responseHeaders.append('set-cookie', 'session=new; HttpOnly; Path=/');
      responseHeaders.append(
        'set-cookie',
        'other=two; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/',
      );
      return new Response('redirect', {
        status: 302,
        headers: responseHeaders,
      });
    },
  };
  const response = await withApiRuntime({ API: binding }, () =>
    proxyApiRequest(
      new Request('https://web.example/api/auth/sign-in/email?next=account', {
        method: 'POST',
        headers: {
          cookie: 'session=bound',
          origin: 'https://web.example',
          authorization: 'not-forwarded',
          'cf-connecting-ip': '203.0.113.8',
          'x-forwarded-for': '198.51.100.7',
        },
        body: '{"email":"a@example.com"}',
      }),
    ),
  );
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toBe('/account');
  expect(response.headers.getSetCookie()).toEqual([
    'session=new; HttpOnly; Path=/',
    'other=two; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/',
  ]);
  expect(response.headers.get('cache-control')).toBe('no-store');
  for (const header of [
    'content-encoding',
    'content-length',
    'transfer-encoding',
  ]) {
    expect(response.headers.has(header)).toBe(false);
  }
  expect(await response.text()).toBe('redirect');
});

it('relays auth bodies, origins and cookies without following redirects or merging Set-Cookie headers', async () => {
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    response.writeHead(302, {
      'content-type': 'application/json',
      location: '/account',
      'set-cookie': [
        'session=one; HttpOnly; Path=/',
        'other=two; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/',
      ],
    });
    response.end(
      JSON.stringify({
        path: request.url,
        method: request.method,
        origin: request.headers.origin,
        cookie: request.headers.cookie,
        authorization: request.headers.authorization ?? null,
        body: Buffer.concat(chunks).toString(),
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing test server address');
  vi.stubEnv('API_URL', `http://127.0.0.1:${address.port}`);
  try {
    const response = await proxyApiRequest(
      new Request('https://web.example/api/auth/sign-out?check=1', {
        method: 'POST',
        headers: {
          origin: 'https://untrusted.example',
          cookie: 'session=old',
          authorization: 'not-forwarded',
          'content-type': 'application/json',
        },
        body: '{}',
      }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/account');
    expect(response.headers.getSetCookie()).toEqual([
      'session=one; HttpOnly; Path=/',
      'other=two; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Path=/',
    ]);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.has('content-length')).toBe(false);
    expect(response.headers.has('transfer-encoding')).toBe(false);
    expect(await response.json()).toEqual({
      path: '/api/auth/sign-out?check=1',
      method: 'POST',
      origin: 'https://untrusted.example',
      cookie: 'session=old',
      authorization: null,
      body: '{}',
    });
    const business = await proxyApiRequest(
      new Request('https://web.example/api/me?check=1', {
        headers: { cookie: 'session=second' },
      }),
    );
    expect(await business.json()).toMatchObject({
      path: '/me?check=1',
      cookie: 'session=second',
      method: 'GET',
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
