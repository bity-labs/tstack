import { Effect, FileSystem } from 'effect';
import { OpenApi } from 'effect/http-api';
import { NodeRuntime, NodeServices } from '@effect/platform-node';
import { Api } from './contract.js';

NodeRuntime.runMain(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* fs.makeDirectory('generated', { recursive: true });
    yield* fs.writeFileString(
      'generated/openapi.json',
      `${JSON.stringify(OpenApi.fromApi(Api), null, 2)}\n`,
    );
  }).pipe(Effect.provide(NodeServices.layer)),
);
