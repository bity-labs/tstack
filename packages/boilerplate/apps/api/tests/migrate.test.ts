import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const execute = promisify(execFile);

it('migrates the local development database under Bun without losing existing data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-migrate-'));
  const filename = join(directory, 'existing.sqlite');
  try {
    const legacy = new DatabaseSync(filename);
    legacy.exec(`
      CREATE TABLE app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO app_metadata VALUES ('existing', 'preserved');
      CREATE TABLE effect_sql_migrations (
        migration_id integer PRIMARY KEY NOT NULL,
        created_at datetime NOT NULL DEFAULT current_timestamp,
        name VARCHAR(255) NOT NULL
      );
      INSERT INTO effect_sql_migrations (migration_id, name) VALUES (1, 'metadata');
    `);
    legacy.close();
    const env = {
      ...process.env,
      DATABASE_PATH: filename,
      BETTER_AUTH_SECRET: 'migration-test-secret-not-for-production-123',
      BETTER_AUTH_URL: 'http://localhost:3000',
      WEB_ORIGIN: 'http://localhost:3000',
    };
    await execute('bun', ['src/migrate.ts'], { env });
    await execute('bun', ['src/migrate.ts'], { env });
    await mkdir(join(directory, 'migrations'));
    await writeFile(
      join(directory, 'migrations/0001_metadata.sql'),
      await readFile('migrations/0001_metadata.sql'),
    );
    await writeFile(
      join(directory, 'migrations/0002_failure.sql'),
      'CREATE TABLE partial (id INTEGER); INVALID SQL;',
    );
    await expect(
      execute(
        'bun',
        [fileURLToPath(new URL('../src/migrate.ts', import.meta.url))],
        {
          env,
          cwd: directory,
        },
      ),
    ).rejects.toThrow();
    const database = new DatabaseSync(filename);
    try {
      expect(database.prepare('SELECT value FROM app_metadata').all()).toEqual([
        { value: 'preserved' },
      ]);
      expect(
        database
          .prepare("SELECT name FROM sqlite_master WHERE name = 'session'")
          .get(),
      ).toEqual({ name: 'session' });
      expect(
        database
          .prepare('SELECT COUNT(*) AS count FROM __alchemy_migrations')
          .get(),
      ).toEqual({ count: 1 });
      expect(
        database.prepare('SELECT name FROM effect_sql_migrations').get(),
      ).toEqual({ name: 'metadata' });
      expect(
        database
          .prepare("SELECT name FROM sqlite_master WHERE name = 'partial'")
          .get(),
      ).toBeUndefined();
    } finally {
      database.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);

it('adopts checksummed history unchanged and refuses rewritten or out-of-order migrations', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-history-'));
  const filename = join(directory, 'existing.sqlite');
  const baseline = await readFile('migrations/0001_metadata.sql', 'utf8');
  const database = new DatabaseSync(filename);
  try {
    database.exec(baseline);
    database.exec(`
      INSERT INTO app_metadata VALUES ('existing', 'preserved');
      CREATE TABLE __alchemy_migrations (
        id INTEGER PRIMARY KEY, hash TEXT NOT NULL, created_at NUMERIC,
        name TEXT, applied_at TEXT
      );
      INSERT INTO __alchemy_migrations VALUES (
        7, 'e861ee857a524ba9383b2e201fa2b35d46898446e012ff1dbd8e242f34d96ccd',
        NULL, '0001_metadata.sql', '2026-11-01 12:00:00'
      );
    `);
    const original = database
      .prepare('SELECT * FROM __alchemy_migrations')
      .get();
    await mkdir(join(directory, 'migrations'));
    await writeFile(join(directory, 'migrations/0001_metadata.sql'), baseline);
    await writeFile(
      join(directory, 'migrations/0002_record.sql'),
      "ALTER TABLE app_metadata ADD COLUMN note TEXT; INSERT INTO app_metadata (key, value, note) VALUES ('new', 'forward migration', 'retained');",
    );
    const run = () =>
      execute(
        'bun',
        [fileURLToPath(new URL('../src/migrate.ts', import.meta.url))],
        {
          cwd: directory,
          env: {
            ...process.env,
            DATABASE_PATH: filename,
            BETTER_AUTH_SECRET: 'migration-test-secret-not-for-production-123',
          },
        },
      );
    await run();
    await run();
    expect(
      database.prepare('SELECT * FROM __alchemy_migrations WHERE id = 7').get(),
    ).toEqual(original);
    expect(
      database.prepare('SELECT * FROM app_metadata ORDER BY key').all(),
    ).toEqual([
      { key: 'existing', value: 'preserved', note: null },
      { key: 'new', value: 'forward migration', note: 'retained' },
    ]);
    await writeFile(
      join(directory, 'migrations/0001_metadata.sql'),
      `${baseline}\n-- edited after application`,
    );
    await expect(run()).rejects.toMatchObject({
      code: 1,
    });
    await writeFile(join(directory, 'migrations/0001_metadata.sql'), baseline);
    await writeFile(
      join(directory, 'migrations/0000_late.sql'),
      "INSERT INTO app_metadata (key, value) VALUES ('wrong', 'out of order');",
    );
    await expect(run()).rejects.toMatchObject({
      code: 1,
    });
    expect(
      database
        .prepare("SELECT value FROM app_metadata WHERE key = 'wrong'")
        .get(),
    ).toBeUndefined();
    await rm(join(directory, 'migrations/0000_late.sql'));
    await rm(join(directory, 'migrations/0001_metadata.sql'));
    await expect(run()).rejects.toMatchObject({
      code: 1,
    });
    expect(
      database
        .prepare('SELECT COUNT(*) AS count FROM __alchemy_migrations')
        .get(),
    ).toEqual({ count: 2 });
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 30_000);
