import { Database } from 'bun:sqlite';
import { closeSync, openSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const [operation, source, destination] = process.argv.slice(2);
if (
  !['backup', 'restore'].includes(operation ?? '') ||
  !source ||
  !destination
) {
  throw new Error(
    'Usage: bun snapshot.ts <backup|restore> <source.sqlite> <new-destination.sqlite>',
  );
}

// VACUUM INTO reads a consistent SQLite snapshot, including committed WAL pages.
// Even restores are isolated copies: this tool never replaces a live database.
const database = new Database(resolve(source), { readonly: true });
let created = false;
try {
  const result = database
    .query<{ integrity_check: string }, []>('PRAGMA integrity_check')
    .all();
  if (result.length !== 1 || result[0]?.integrity_check !== 'ok') {
    throw new Error('Source database failed integrity checking');
  }
  closeSync(openSync(resolve(destination), 'wx', 0o600));
  created = true;
  database.query('VACUUM INTO ?').run(resolve(destination));
} catch (error) {
  if (created) unlinkSync(resolve(destination));
  throw error;
} finally {
  database.close();
}
console.log(
  JSON.stringify({ event: operation, destination: resolve(destination) }),
);
