import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const execute = promisify(execFile);

it('backs up committed WAL data and restores only to a new database', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-snapshot-'));
  const source = join(directory, 'live.sqlite');
  const backup = join(directory, 'backup.sqlite');
  const restored = join(directory, 'restored.sqlite');
  const database = new DatabaseSync(source);
  try {
    database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA wal_autocheckpoint = 0;
      CREATE TABLE records (id TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO records VALUES ('before', 'committed in WAL');
    `);
    await execute('bun', ['src/snapshot.ts', 'backup', source, backup]);
    database.exec("INSERT INTO records VALUES ('after', 'not in snapshot')");
    await execute('bun', ['src/snapshot.ts', 'restore', backup, restored]);
    const copy = new DatabaseSync(restored);
    try {
      expect(copy.prepare('SELECT * FROM records').all()).toEqual([
        { id: 'before', value: 'committed in WAL' },
      ]);
      expect(copy.prepare('PRAGMA integrity_check').get()).toEqual({
        integrity_check: 'ok',
      });
    } finally {
      copy.close();
    }
    await expect(
      execute('bun', ['src/snapshot.ts', 'restore', backup, source]),
    ).rejects.toThrow();
    expect(
      database.prepare('SELECT COUNT(*) AS count FROM records').get(),
    ).toEqual({ count: 2 });
    await expect(
      execute('bun', ['src/snapshot.ts', 'backup', source, backup]),
    ).rejects.toThrow();
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});
