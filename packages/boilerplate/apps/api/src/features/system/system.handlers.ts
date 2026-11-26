import { Effect } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { SqlClient } from 'effect/sql';
import { Api } from '../../contract.js';
import { StorageUnavailable } from '../../lib/http-errors.js';
import { Health } from './system.schema.js';

export const HealthHandlers = HttpApiBuilder.group(
  Api,
  'system',
  Effect.fnUntraced(function* (handlers) {
    const sql = yield* SqlClient.SqlClient;
    return handlers.handle('health', () =>
      Effect.gen(function* () {
        yield* sql`SELECT 1`;
        return new Health({ status: 'ok', storage: 'sqlite' });
      }).pipe(
        Effect.mapError(
          () => new StorageUnavailable({ message: 'Storage is unavailable' }),
        ),
      ),
    );
  }),
);
