import { BunRuntime, BunServices } from '@effect/platform-bun';
import { Effect } from 'effect';
import { apiConfig } from './lib/config.js';
import { migrateSqlite } from './lib/migrate-sqlite.js';

BunRuntime.runMain(
  Effect.gen(function* () {
    yield* migrateSqlite(yield* apiConfig);
    yield* Effect.log('SQLite migrations complete');
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
);
