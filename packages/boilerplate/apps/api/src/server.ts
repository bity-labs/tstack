import { Effect, Layer } from 'effect';
import { HttpApiBuilder } from 'effect/http-api';
import { RuntimeContext } from 'alchemy';
import { HttpRouter, HttpServerResponse } from 'effect/http';
import { Api } from './contract.js';
import { Auth } from './lib/auth.js';
import { HealthHandlers } from './features/system/system.handlers.js';
import { AccountHandlers } from './features/account/account.handlers.js';

const AuthRoutes = Layer.unwrap(
  Effect.gen(function* () {
    const auth = yield* Auth;
    return HttpRouter.add(
      '*',
      '/api/auth/*',
      auth.fetch.pipe(Effect.provide(RuntimeContext.phantom)),
    );
  }),
);

export const ApiRoutes = Layer.mergeAll(
  HttpApiBuilder.layer(Api, {
    openapiPath: '/openapi.json',
  }).pipe(Layer.provide(Layer.mergeAll(HealthHandlers, AccountHandlers))),
  AuthRoutes,
  HttpRouter.middleware(
    (httpEffect) =>
      httpEffect.pipe(
        Effect.map(HttpServerResponse.setHeader('cache-control', 'no-store')),
      ),
    { global: true },
  ),
);
