import * as Cloudflare from '@alchemy.run/cloudflare';
import { CloudflareD1 } from '@alchemy.run/better-auth/CloudflareD1';
import { D1Layer } from '@alchemy.run/cloudflare/D1/SQL';
import { RemovalPolicy, RuntimeContext } from 'alchemy';
import { Effect, Layer } from 'effect';
import { HttpRouter, HttpServer, HttpServerResponse } from 'effect/http';
import { fileURLToPath } from 'node:url';
import { Auth, authLayer } from '../apps/api/src/lib/auth.js';
import { ApiRoutes } from '../apps/api/src/server.js';
import { topology } from './config.js';
import { deployment } from './settings.js';

export const Database = Effect.gen(function* () {
  const config = yield* deployment;
  return yield* Cloudflare.D1.Database('Database', {
    name: topology(config).names.database,
    migrations: fileURLToPath(
      new URL('../apps/api/migrations', import.meta.url),
    ),
  }).pipe(RemovalPolicy.protect());
});

// Better Auth constructs its actual instance lazily per Worker execution.
// Force its context to initialize before any route can claim readiness. Never
// capture an event's auth instance in a module-level promise/cache.
const AuthReadiness = Layer.unwrap(
  Effect.gen(function* () {
    const auth = yield* Auth;
    return HttpRouter.middleware(
      (httpEffect) =>
        Effect.gen(function* () {
          const instance = yield* auth.auth.pipe(
            Effect.provide(RuntimeContext.phantom),
          );
          yield* Effect.promise(() => instance.$context);
        }).pipe(
          Effect.matchCauseEffect({
            onFailure: () =>
              Effect.succeed(
                HttpServerResponse.text('Service unavailable', { status: 503 }),
              ),
            onSuccess: () => httpEffect,
          }),
          Effect.map(HttpServerResponse.setHeader('cache-control', 'no-store')),
        ),
      { global: true },
    );
  }),
);

export default class Api extends Cloudflare.Worker<Api>()(
  'Api',
  Effect.gen(function* () {
    const config = yield* deployment;
    return {
      name: topology(config).names.api,
      main: import.meta.url,
      compatibility: { flags: ['nodejs_compat'] },
      domain: { name: config.domains.api, zoneId: config.zoneId },
      workersDev: { enabled: false, previewsEnabled: false },
      env: { DEPLOY_CONFIG: JSON.stringify(config) },
    };
  }),
  Effect.gen(function* () {
    const config = yield* deployment;
    const { origins } = topology(config);
    const database = yield* Database;
    const d1 = yield* Cloudflare.D1.QueryDatabase(database);
    const sender = yield* Cloudflare.Email.SendEmail('AuthEmail', {
      allowedSenderAddresses: [config.emailFrom],
    });
    const email = yield* Cloudflare.Email.Send(sender);
    const fetch = yield* HttpRouter.toHttpEffect(
      Layer.mergeAll(
        ApiRoutes,
        AuthReadiness,
        HttpRouter.cors({
          allowedOrigins: [origins.web],
          allowedMethods: ['GET', 'POST', 'OPTIONS'],
          credentials: true,
        }),
      ).pipe(
        Layer.provide(
          authLayer({
            baseURL: origins.api,
            webOrigin: origins.web,
            migrate: true,
            async sendEmail(message) {
              await Effect.runPromise(
                email
                  .send({ ...message, from: config.emailFrom })
                  .pipe(Effect.provide(RuntimeContext.phantom)),
              );
            },
          }).pipe(Layer.provide(CloudflareD1(database))),
        ),
        Layer.provide(D1Layer(d1)),
      ),
    ).pipe(Effect.provide(HttpServer.layerServices));
    return { fetch };
  }).pipe(
    Effect.provide(Cloudflare.D1.QueryDatabaseBinding),
    Effect.provide(Cloudflare.Email.SendBinding),
  ),
) {}
