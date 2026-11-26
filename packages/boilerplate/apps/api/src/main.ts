import { Console, Effect } from 'effect';
import { HttpServer } from 'effect/http';
import { BunHttpServer, BunRuntime, BunServices } from '@effect/platform-bun';
import { apiConfig } from './lib/config.js';
import { makeBunApi } from './hosts/bun.js';

BunRuntime.runMain(
  Effect.gen(function* () {
    const options = yield* apiConfig;
    const api = yield* makeBunApi(options);
    const server = yield* BunHttpServer.make({
      port: options.port,
      hostname: process.env.HOST ?? '0.0.0.0',
    });
    yield* server.serve(api.fetch);
    yield* Console.log(
      JSON.stringify({
        event: 'listening',
        url: HttpServer.formatAddress(server.address),
      }),
    );
    yield* Effect.never;
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer)),
);
