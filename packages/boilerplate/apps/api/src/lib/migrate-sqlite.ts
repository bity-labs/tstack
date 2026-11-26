import { Database } from 'bun:sqlite';
import { BunServices } from '@effect/platform-bun';
import {
  applyMigrations,
  MigrationError,
  type SqlExecutor,
} from '@alchemy.run/sql/Migrations';
import { applyMigrations as applyAuthMigrations } from '@alchemy.run/better-auth/Migrate';
import { Database as AuthDatabase } from '@alchemy.run/better-auth/Database';
import { SQLite } from '@alchemy.run/better-auth/SQLite';
import { RuntimeContext } from 'alchemy';
import { Effect } from 'effect';
import { authOptions, type AuthOptions } from './auth.js';

export const migrateSqlite = Effect.fn('migrateSqlite')(function* (
  options: AuthOptions & { filename: string; migrationsDirectory?: string },
) {
  const database = yield* Effect.acquireRelease(
    Effect.try(() => new Database(options.filename, { create: true })),
    (connection) => Effect.sync(() => connection.close()),
  );
  yield* Effect.try(() => {
    database.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const legacy = database
      .query(
        "SELECT name FROM sqlite_master WHERE name = 'effect_sql_migrations'",
      )
      .get();
    if (legacy) {
      const history = database
        .query<{ migration_id: number; name: string }, []>(
          'SELECT migration_id, name FROM effect_sql_migrations ORDER BY migration_id',
        )
        .all();
      if (
        history.some((row) => row.migration_id !== 1 || row.name !== 'metadata')
      ) {
        throw new Error(
          'Unrecognized legacy migrations; review and convert history before deploying.',
        );
      }
    }
    // Only validate the old baseline during adoption. A forward migration
    // may legitimately evolve app_metadata after history has been recorded.
    const hasHistory =
      database
        .query(
          "SELECT name FROM sqlite_master WHERE name = '__alchemy_migrations'",
        )
        .get() &&
      database
        .query<{ count: number }, []>(
          'SELECT COUNT(*) AS count FROM __alchemy_migrations',
        )
        .get()!.count > 0;
    if (hasHistory) return;
    const columns = database
      .query<{ name: string; type: string; notnull: number; pk: number }, []>(
        'PRAGMA table_info(app_metadata)',
      )
      .all();
    if (
      columns.length &&
      (columns.length !== 2 ||
        columns[0]?.name !== 'key' ||
        columns[0].type.toUpperCase() !== 'TEXT' ||
        columns[0].pk !== 1 ||
        columns[1]?.name !== 'value' ||
        columns[1].type.toUpperCase() !== 'TEXT' ||
        columns[1].notnull !== 1)
    ) {
      throw new Error(
        'Existing app_metadata schema does not match the migration baseline.',
      );
    }
  });
  const executor: SqlExecutor = {
    dialect: 'sqlite',
    query: (sql, parameters = []) =>
      Effect.try({
        try: () =>
          database.query(sql).all(...(parameters as never[])) as Array<
            Record<string, unknown>
          >,
        catch: (cause) =>
          new MigrationError({
            message: 'SQLite migration query failed',
            cause,
          }),
      }),
    batch: (statements) =>
      Effect.try({
        try: () =>
          database
            .transaction(() => {
              for (const statement of statements) database.exec(statement);
            })
            .immediate(),
        catch: (cause) =>
          new MigrationError({
            message: 'SQLite migration batch failed',
            cause,
          }),
      }),
  };
  yield* applyMigrations({
    resolved: {
      dir: options.migrationsDirectory ?? 'migrations',
      table: '__alchemy_migrations',
    },
    executor,
  }).pipe(Effect.provide(BunServices.layer));
  yield* Effect.gen(function* () {
    const db = yield* AuthDatabase;
    if (!db.migrate)
      return yield* Effect.die(
        new Error('SQLite auth migrations are unavailable'),
      );
    yield* applyAuthMigrations(db.migrate, {
      ...authOptions(options),
      secret: 'migration-schema-introspection-only',
    });
  }).pipe(
    Effect.provide(SQLite(options.filename)),
    Effect.provide(RuntimeContext.phantom),
  );
});
