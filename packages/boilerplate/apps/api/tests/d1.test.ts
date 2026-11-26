import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Miniflare, Response as WorkerResponse } from 'miniflare';
import { applyMigrations } from '@alchemy.run/better-auth/Migrate';
import { RuntimeContext } from 'alchemy';
import { Effect } from 'effect';
import { expect, it } from 'vitest';
import { authOptions } from '../src/lib/auth.js';

const execute = promisify(execFile);
const origin = 'http://localhost:3000';
const secret = 'd1-test-secret-not-for-production-29385';

it('serves authenticated Effect routes in workerd using real D1 and the Expo plugin', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-d1-'));
  let runtime: Miniflare | undefined;
  const mailbox: Array<{ to: string; text: string }> = [];
  let deliveryUnavailable = false;
  try {
    const bundle = join(directory, 'worker.mjs');
    await execute('bun', [
      'build',
      'tests/fixtures/d1-worker.ts',
      '--target=browser',
      '--conditions=worker',
      '--define',
      'globalThis.__ALCHEMY_RUNTIME__=true',
      '--external',
      'node:*',
      '--external',
      'cloudflare:*',
      '--outfile',
      bundle,
    ]);
    runtime = new Miniflare({
      workers: [
        {
          dev: {
            outboundService: {
              type: 'fetcher',
              async handler(request) {
                expect(request.url).toBe('https://mailbox.example.test/');
                if (deliveryUnavailable)
                  return new WorkerResponse('Unavailable', { status: 503 });
                mailbox.push(
                  (await request.json()) as { to: string; text: string },
                );
                return new WorkerResponse('Accepted');
              },
            },
          },
          config: {
            name: 'api',
            compatibilityDate: '2026-10-26',
            compatibilityFlags: ['nodejs_compat'],
            manifest: {
              mainModule: 'worker.mjs',
              modules: {
                'worker.mjs': {
                  type: 'esm',
                  contents: await readFile(bundle, 'utf8'),
                },
              },
            },
            env: { DB: { type: 'd1', id: 'local-test-database' } },
          },
        },
      ],
    });
    const database = await runtime.getD1Database('DB');
    await database.exec(await readFile('migrations/0001_metadata.sql', 'utf8'));
    const migrate = applyMigrations(
      {
        identity: { databaseId: 'local-test-database' },
        connect: Effect.succeed(Effect.succeed(database)),
      },
      {
        ...authOptions({ secret, baseURL: origin, webOrigin: origin }),
        secret,
      },
    ).pipe(Effect.provide(RuntimeContext.phantom));
    expect((await Effect.runPromise(migrate)).tablesCreated).toBeGreaterThan(0);
    expect(await Effect.runPromise(migrate)).toEqual({
      tablesCreated: 0,
      tablesAltered: 0,
      indexesCreated: 0,
    });
    const call = (
      path: string,
      options?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      },
    ) => runtime!.dispatchFetch(`${origin}${path}`, options);
    expect((await call('/me')).status).toBe(401);
    expect(await (await call('/health')).json()).toEqual({
      status: 'ok',
      storage: 'sqlite',
    });
    const signup = await call('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'd1@example.test',
        password: 'A-long-d1-password-57!',
        name: 'D1 User',
      }),
    });
    expect(signup.status).toBe(200);
    const cookie = signup.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    expect(cookie).not.toBe('');
    const profile = await call('/me', { headers: { cookie } });
    expect(profile.status).toBe(200);
    expect(await profile.json()).toMatchObject({
      email: 'd1@example.test',
      name: 'D1 User',
    });
    expect(profile.headers.getSetCookie()).toEqual([]);
    const signIn = (password: string) =>
      call('/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'expo-origin': 'tstack://',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email: 'd1@example.test', password }),
      });
    expect((await signIn('Wrong-password-9357')).status).toBe(401);
    const native = await signIn('A-long-d1-password-57!');
    expect(native.status).toBe(200);
    const nativeCookie = native.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    expect(nativeCookie).not.toBe(cookie);
    expect(
      (
        await call('/api/auth/sign-out', {
          method: 'POST',
          headers: {
            cookie,
            origin: 'https://attacker.example',
            'content-type': 'application/json',
          },
          body: '{}',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await call('/api/auth/sign-out', {
          method: 'POST',
          headers: {
            cookie,
            origin,
            'content-type': 'application/json',
          },
          body: '{}',
        })
      ).status,
    ).toBe(200);
    expect((await call('/me', { headers: { cookie } })).status).toBe(401);
    expect(
      (await call('/me', { headers: { cookie: nativeCookie } })).status,
    ).toBe(200);
    const expiresAt = Date.now() + 3_600_000;
    await database
      .prepare('UPDATE session SET updatedAt = ?, expiresAt = ?')
      .bind(Date.now() - 2 * 86_400_000, expiresAt)
      .run();
    expect(
      (
        await call('/me', { headers: { cookie: nativeCookie } })
      ).headers.getSetCookie(),
    ).toEqual([]);
    expect(
      await database.prepare('SELECT expiresAt FROM session').first(),
    ).toEqual({ expiresAt });
    await database
      .prepare('UPDATE session SET expiresAt = ?')
      .bind(Date.now() - 1000)
      .run();
    expect(
      (await call('/me', { headers: { cookie: nativeCookie } })).status,
    ).toBe(401);
    const postOtp = (path: string, body: unknown) =>
      call(`/api/auth/${path}`, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    const requestCode = () =>
      postOtp('email-otp/send-verification-otp', {
        email: 'otp-d1@example.test',
        type: 'sign-in',
      });
    expect((await requestCode()).status).toBe(200);
    expect(mailbox).toHaveLength(1);
    expect(mailbox[0]!.to).toBe('otp-d1@example.test');
    const otp = mailbox[0]!.text.match(/\b\d{6}\b/)![0];
    expect(
      (await database.prepare('SELECT value FROM verification').all()).results
        .map((row) => row.value)
        .join(' '),
    ).not.toContain(otp);
    const passwordless = await postOtp('sign-in/email-otp', {
      email: 'otp-d1@example.test',
      otp,
    });
    expect(passwordless.status).toBe(200);
    const otpCookie = passwordless.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
    expect(
      await (await call('/me', { headers: { cookie: otpCookie } })).json(),
    ).toMatchObject({ email: 'otp-d1@example.test', emailVerified: true });
    expect(
      (
        await postOtp('sign-in/email-otp', {
          email: 'otp-d1@example.test',
          otp,
        })
      ).status,
    ).toBe(400);
    deliveryUnavailable = true;
    const failedDelivery = await requestCode();
    expect(failedDelivery.status).toBe(503);
    expect(failedDelivery.headers.get('cache-control')).toBe('no-store');
    expect(await failedDelivery.json()).toMatchObject({
      message: 'Email delivery is unavailable. Please try again later.',
    });
    expect(mailbox).toHaveLength(1);
    await database.exec('DROP TABLE session');
    const unavailable = await call('/me', {
      headers: { cookie: nativeCookie },
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({
      message: 'Storage is unavailable',
    });
  } finally {
    await runtime?.dispose();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
