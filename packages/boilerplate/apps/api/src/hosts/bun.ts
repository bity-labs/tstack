import { SQLite } from '@alchemy.run/better-auth/SQLite';
import { HttpRouter, HttpServer, HttpServerResponse } from 'effect/http';
import { Effect, Layer, Scope } from 'effect';
import { authLayer, type AuthOptions } from '../lib/auth.js';
import { databaseLayer } from '../lib/database.js';
import { migrateSqlite } from '../lib/migrate-sqlite.js';
import { ApiRoutes } from '../server.js';
import { localEmail } from './local-email.js';

export const makeBunApi = Effect.fn('makeBunApi')(function* (
  options: AuthOptions & {
    filename: string;
    migrationsDirectory?: string;
    emailDirectory?: string;
  },
) {
  // Initialize once in the host's scope, not in the first HTTP request's
  // context: the cached router must never retain that request's identity.
  const context = yield* Effect.context<Scope.Scope>();
  const handler = yield* Effect.cached(
    Effect.gen(function* () {
      yield* migrateSqlite(options).pipe(Effect.scoped);
      return yield* HttpRouter.toHttpEffect(
        ApiRoutes.pipe(
          Layer.provide(databaseLayer(options.filename)),
          Layer.provide(
            authLayer({
              ...options,
              migrate: false,
              sendEmail:
                options.sendEmail ??
                localEmail(options.emailDirectory ?? '.local/emails'),
            }).pipe(Layer.provide(SQLite(options.filename))),
          ),
          Layer.merge(
            HttpRouter.cors({
              allowedOrigins: [options.webOrigin],
              allowedMethods: ['GET', 'POST', 'OPTIONS'],
              credentials: true,
            }),
          ),
        ),
      ).pipe(Effect.provide(HttpServer.layerServices));
    }).pipe(Effect.updateContext<never, Scope.Scope>(() => context)),
  );
  return {
    fetch: Effect.matchCauseEffect(handler, {
      onFailure: () =>
        Effect.succeed(
          HttpServerResponse.jsonUnsafe(
            { message: 'Storage is unavailable' },
            { status: 503, headers: { 'cache-control': 'no-store' } },
          ),
        ),
      onSuccess: (fetch) => fetch,
    }),
  };
});
