import type { D1Database } from '@cloudflare/workers-types';
import { Database } from '@alchemy.run/better-auth/Database';
import { D1Client } from '@effect/sql-d1';
import { Effect, Layer } from 'effect';
import { HttpRouter, HttpServer } from 'effect/http';
import { ApiRoutes } from '../../src/server.js';
import { authLayer } from '../../src/lib/auth.js';

export default {
  async fetch(request: Request, env: { DB: D1Database }) {
    const application = HttpRouter.toWebHandler(
      ApiRoutes.pipe(
        Layer.provide(D1Client.layer({ db: env.DB })),
        Layer.provide(
          authLayer({
            secret: 'd1-test-secret-not-for-production-29385',
            baseURL: 'http://localhost:3000',
            webOrigin: 'http://localhost:3000',
            async sendEmail(message) {
              const response = await fetch('https://mailbox.example.test', {
                method: 'POST',
                body: JSON.stringify(message),
              });
              if (!response.ok) throw new Error('Email delivery unavailable');
            },
          }).pipe(
            Layer.provide(
              Layer.succeed(Database, {
                provider: 'sqlite',
                runtime: Effect.succeed(env.DB),
              }),
            ),
          ),
        ),
        Layer.provide(HttpServer.layerServices),
      ),
      { disableLogger: true },
    );
    try {
      return await application.handler(request);
    } finally {
      await application.dispose();
    }
  },
};
