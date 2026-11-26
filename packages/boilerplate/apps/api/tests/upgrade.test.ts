import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { startApi } from './api-process.js';

const execute = promisify(execFile);

it('preserves an existing account, password and session through Alchemy/Bun adoption and isolated recovery', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-upgrade-'));
  const filename = join(directory, 'existing.sqlite');
  const origin = 'http://localhost:3000';
  const credentials = {
    email: 'existing@example.test',
    password: 'Existing-password-7381!',
  };
  let app: Awaited<ReturnType<typeof startApi>> | undefined;
  try {
    const database = new DatabaseSync(filename);
    let cookie: string;
    try {
      const options = {
        database,
        secret: 'test-secret-only-not-for-production-8326',
        baseURL: origin,
        emailAndPassword: { enabled: true },
      };
      await (await getMigrations(options)).runMigrations();
      const signup = await betterAuth(options).handler(
        new Request(`${origin}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: { origin, 'content-type': 'application/json' },
          body: JSON.stringify({ ...credentials, name: 'Existing User' }),
        }),
      );
      expect(signup.status).toBe(200);
      cookie = signup.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
    } finally {
      database.close();
    }
    app = await startApi(filename);
    const profile = await app.handler(
      new Request(`${origin}/me`, { headers: { cookie } }),
    );
    expect(profile.status).toBe(200);
    expect(await profile.json()).toMatchObject({
      name: 'Existing User',
      email: credentials.email,
    });
    const backup = join(directory, 'backup.sqlite');
    const restored = join(directory, 'restored.sqlite');
    await execute('bun', ['src/snapshot.ts', 'backup', filename, backup]);
    await execute('bun', ['src/snapshot.ts', 'restore', backup, restored]);
    await app.dispose();
    app = undefined;
    app = await startApi(restored);
    const recoveredProfile = await app.handler(
      new Request(`${origin}/me`, { headers: { cookie } }),
    );
    expect(recoveredProfile.status).toBe(200);
    expect(await recoveredProfile.json()).toMatchObject({
      name: 'Existing User',
      email: credentials.email,
    });
    const signin = await app.handler(
      new Request(`${origin}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify(credentials),
      }),
    );
    expect(signin.status).toBe(200);
    expect((await signin.json()).user.email).toBe(credentials.email);
  } finally {
    await app?.dispose();
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
