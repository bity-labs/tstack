import { expect, it } from '@effect/vitest';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startApi } from './api-process.js';

const origin = 'http://localhost:3000';
const credentials = {
  email: 'alex@example.test',
  password: 'A-long-test-password-47!',
};

const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

it('signs in with a locally captured email code without a password', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-email-otp-'));
  const filename = join(directory, 'auth.sqlite');
  const app = await startApi(filename);
  const post = (path: string, body: unknown) =>
    app.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify(body),
      }),
    );
  try {
    const requested = await post('email-otp/send-verification-otp', {
      email: 'code@example.test',
      type: 'sign-in',
    });
    expect(requested.status).toBe(200);
    expect(requested.headers.get('cache-control')).toBe('no-store');
    const inbox = `${filename}.emails`;
    const files = await readdir(inbox);
    expect(files).toHaveLength(1);
    const path = join(inbox, files[0]!);
    const email = JSON.parse(await readFile(path, 'utf8')) as {
      to: string;
      text: string;
    };
    expect(email.to).toBe('code@example.test');
    const otp = email.text.match(/\b\d{6}\b/)?.[0];
    expect(otp).toMatch(/^\d{6}$/);
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    const database = new DatabaseSync(filename);
    try {
      const stored = database
        .prepare('SELECT value, expiresAt FROM verification')
        .get()!;
      expect(stored.value).not.toContain(otp);
      const remaining =
        new Date(String(stored.expiresAt)).getTime() - Date.now();
      expect(remaining).toBeGreaterThan(290_000);
      expect(remaining).toBeLessThanOrEqual(300_000);
    } finally {
      database.close();
    }
    const response = await post('sign-in/email-otp', {
      email: email.to,
      otp,
      name: 'Code User',
    });
    expect(response.status).toBe(200);
    const cookie = cookieFrom(response);
    expect(cookie).not.toBe('');
    const profile = await app.handler(
      new Request(`${origin}/me`, { headers: { cookie } }),
    );
    expect(profile.status).toBe(200);
    expect(await profile.json()).toMatchObject({
      email: email.to,
      emailVerified: true,
      name: 'Code User',
    });
    expect(
      (await post('sign-in/email-otp', { email: email.to, otp })).status,
    ).toBe(400);
  } finally {
    await app.dispose();
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

it('expires codes, limits guessing and sending, and rejects hostile origins', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-otp-security-'));
  const filename = join(directory, 'auth.sqlite');
  const app = await startApi(filename);
  const database = new DatabaseSync(filename);
  let requestNumber = 0;
  const post = (
    path: string,
    body: unknown,
    requestOrigin = origin,
    clientIp = '203.0.113.1',
  ) =>
    app.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: requestOrigin,
          'cf-connecting-ip': clientIp,
          'x-forwarded-for': `198.51.100.${++requestNumber}`,
        },
        body: JSON.stringify(body),
      }),
    );
  const send = (email: string) =>
    post('email-otp/send-verification-otp', { email, type: 'sign-in' });
  const inbox = `${filename}.emails`;
  const codeFor = async (recipient: string) => {
    for (const file of await readdir(inbox)) {
      const email = JSON.parse(await readFile(join(inbox, file), 'utf8')) as {
        to: string;
        text: string;
      };
      if (email.to === recipient) return email.text.match(/\b\d{6}\b/)![0];
    }
    throw new Error('No captured email for the expected recipient');
  };
  try {
    expect(
      (
        await post(
          'email-otp/send-verification-otp',
          { email: 'hostile@example.test', type: 'sign-in' },
          'https://attacker.example',
        )
      ).status,
    ).toBe(403);
    expect((await send('expired@example.test')).status).toBe(200);
    const expired = await codeFor('expired@example.test');
    database
      .prepare('UPDATE verification SET expiresAt = ?')
      .run(new Date(Date.now() - 1000).toISOString());
    const expiredResponse = await post('sign-in/email-otp', {
      email: 'expired@example.test',
      otp: expired,
    });
    expect(expiredResponse.status).toBe(400);
    expect(await expiredResponse.json()).toMatchObject({ code: 'OTP_EXPIRED' });
    expect((await send('guess@example.test')).status).toBe(200);
    const valid = await codeFor('guess@example.test');
    const wrong = valid === '000000' ? '111111' : '000000';
    for (let attempt = 0; attempt < 3; attempt++) {
      // Isolate OTP attempt limits from the separate per-IP HTTP rate limit.
      database.exec('UPDATE rateLimit SET lastRequest = 0');
      const response = await post('sign-in/email-otp', {
        email: 'guess@example.test',
        otp: wrong,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: 'INVALID_OTP' });
    }
    database.exec('UPDATE rateLimit SET lastRequest = 0');
    const exhausted = await post('sign-in/email-otp', {
      email: 'guess@example.test',
      otp: valid,
    });
    expect(exhausted.status).toBe(403);
    expect(await exhausted.json()).toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
    // A new rate-limit window permits three sends, including resends, not four.
    for (let count = 0; count < 3; count++)
      expect((await send('limited@example.test')).status).toBe(200);
    expect((await send('limited@example.test')).status).toBe(429);
    expect(await readdir(inbox)).toHaveLength(5);
    expect(
      (
        await post(
          'email-otp/send-verification-otp',
          { email: 'other@example.test', type: 'sign-in' },
          origin,
          '203.0.113.2',
        )
      ).status,
    ).toBe(200);
  } finally {
    database.close();
    await app.dispose();
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

it('proves email ownership before retaining existing access and rotates resent codes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-otp-ownership-'));
  const filename = join(directory, 'auth.sqlite');
  const app = await startApi(filename);
  const database = new DatabaseSync(filename);
  const post = async (path: string, body: unknown) => {
    // This scenario isolates ownership/rotation from HTTP throttling.
    database.exec('UPDATE rateLimit SET lastRequest = 0');
    return app.handler(
      new Request(`${origin}/api/auth/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin },
        body: JSON.stringify(body),
      }),
    );
  };
  try {
    await app.handler(new Request(`${origin}/health`));
    for (const verified of [true, false]) {
      const email = `${verified ? 'verified' : 'unverified'}@example.test`;
      const signup = await post('sign-up/email', {
        ...credentials,
        email,
        name: 'Existing User',
      });
      expect(signup.status).toBe(200);
      const oldCookie = cookieFrom(signup);
      if (verified)
        database
          .prepare('UPDATE user SET emailVerified = 1 WHERE email = ?')
          .run(email);
      let files: string[] = await readdir(`${filename}.emails`).catch(() => []);
      let otp = '';
      let previousOtp = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        expect(
          (
            await post('email-otp/send-verification-otp', {
              email,
              type: 'sign-in',
            })
          ).status,
        ).toBe(200);
        const nextFiles = await readdir(`${filename}.emails`);
        const newFile = nextFiles.find((file) => !files.includes(file))!;
        const message = JSON.parse(
          await readFile(join(`${filename}.emails`, newFile), 'utf8'),
        ) as { text: string };
        previousOtp = otp;
        otp = message.text.match(/\b\d{6}\b/)![0];
        files = nextFiles;
      }
      // A rare random repeat is still the current code, not a stale code.
      if (previousOtp !== otp)
        expect(
          (await post('sign-in/email-otp', { email, otp: previousOtp })).status,
        ).toBe(400);
      const signedIn = await post('sign-in/email-otp', { email, otp });
      expect(signedIn.status).toBe(200);
      expect(
        await (
          await app.handler(
            new Request(`${origin}/me`, {
              headers: { cookie: cookieFrom(signedIn) },
            }),
          )
        ).json(),
      ).toMatchObject({ email, emailVerified: true });
      expect(
        (
          await app.handler(
            new Request(`${origin}/me`, { headers: { cookie: oldCookie } }),
          )
        ).status,
      ).toBe(verified ? 200 : 401);
      expect(
        (await post('sign-in/email', { ...credentials, email })).status,
      ).toBe(verified ? 200 : 401);
    }
  } finally {
    database.close();
    await app.dispose();
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

it('persists independent web/native sessions and enforces revocation, expiry and origins', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-auth-'));
  const filename = join(directory, 'auth.sqlite');
  let app = await startApi(filename);
  const call = (path: string, options?: RequestInit) =>
    app.handler(new Request(`${origin}${path}`, options));
  const post = (path: string, body: unknown, headers: HeadersInit = {}) =>
    call(`/api/auth/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin, ...headers },
      body: JSON.stringify(body),
    });
  try {
    expect((await call('/me')).status).toBe(401);
    expect(
      (
        await post('sign-up/email', {
          ...credentials,
          name: 'Alex',
          password: 'short',
        })
      ).status,
    ).toBe(400);
    const signup = await post('sign-up/email', {
      ...credentials,
      name: 'Alex Example',
    });
    expect(signup.status).toBe(200);
    const webCookie = cookieFrom(signup);
    expect(webCookie).not.toBe('');
    expect(
      signup.headers.getSetCookie().some((cookie) => /httponly/i.test(cookie)),
    ).toBe(true);
    expect(
      (
        await call('/me', {
          headers: { cookie: 'better-auth.session_token=forged' },
        })
      ).status,
    ).toBe(401);
    const profile = await call('/me', { headers: { cookie: webCookie } });
    expect(profile.headers.get('cache-control')).toBe('no-store');
    expect(await profile.json()).toEqual({
      id: expect.any(String),
      name: 'Alex Example',
      email: credentials.email,
      emailVerified: false,
    });

    await app.dispose();
    app = await startApi(filename);
    expect((await call('/me', { headers: { cookie: webCookie } })).status).toBe(
      200,
    );
    expect(
      (
        await post('sign-in/email', {
          ...credentials,
          password: 'Wrong-password-123',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await post('sign-in/email', credentials, {
          origin: 'https://attacker.example',
        })
      ).status,
    ).toBe(403);
    const native = await call('/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'expo-origin': 'tstack://',
      },
      body: JSON.stringify(credentials),
    });
    expect(native.status).toBe(200);
    const nativeCookie = cookieFrom(native);
    expect(nativeCookie).not.toBe(webCookie);
    expect(
      (await call('/me', { headers: { cookie: nativeCookie } })).status,
    ).toBe(200);
    expect(
      (
        await post(
          'sign-out',
          {},
          { cookie: webCookie, origin: 'https://attacker.example' },
        )
      ).status,
    ).toBe(403);
    const signedOut = await post('sign-out', {}, { cookie: webCookie });
    expect(signedOut.status).toBe(200);
    expect(
      signedOut.headers
        .getSetCookie()
        .some((cookie) => /max-age=0/i.test(cookie)),
    ).toBe(true);
    expect((await call('/me', { headers: { cookie: webCookie } })).status).toBe(
      401,
    );
    expect(
      (await call('/me', { headers: { cookie: nativeCookie } })).status,
    ).toBe(200);

    const database = new DatabaseSync(filename);
    const expiresAt = Date.now() + 3_600_000;
    database
      .prepare('UPDATE session SET updatedAt = ?, expiresAt = ?')
      .run(Date.now() - 2 * 86_400_000, expiresAt);
    const aged = await call('/me', { headers: { cookie: nativeCookie } });
    expect(aged.status).toBe(200);
    expect(aged.headers.getSetCookie()).toEqual([]);
    expect(database.prepare('SELECT expiresAt FROM session').get()).toEqual({
      expiresAt,
    });
    database.prepare('UPDATE session SET expiresAt = ?').run(Date.now() - 1000);
    expect(
      (await call('/me', { headers: { cookie: nativeCookie } })).status,
    ).toBe(401);
    database.exec('DROP TABLE session');
    const unavailable = await call('/me', {
      headers: { cookie: nativeCookie },
    });
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({
      message: 'Storage is unavailable',
    });
    database.close();
  } finally {
    await app.dispose();
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
