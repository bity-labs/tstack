import { SqliteClient } from '@effect/sql-sqlite-bun';

export const databaseLayer = (filename: string) =>
  SqliteClient.layer({ filename });
