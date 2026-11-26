import * as Cloudflare from '@alchemy.run/cloudflare';
import { Effect } from 'effect';
import { fileURLToPath } from 'node:url';
import Api, { Database } from './cloudflare-api.js';
import { topology } from './config.js';
import { deployment } from './settings.js';

export const cloudflare = Effect.gen(function* () {
  const config = yield* deployment;
  const { names, origins } = topology(config);
  const api = yield* Api;
  yield* Cloudflare.Website.Vite('Web', {
    name: names.web,
    rootDir: fileURLToPath(new URL('../apps/web', import.meta.url)),
    main: 'src/server.ts',
    compatibility: { flags: ['nodejs_compat'] },
    domain: { name: config.domains.web, zoneId: config.zoneId },
    workersDev: { enabled: false, previewsEnabled: false },
    env: { API: api, API_URL: origins.api },
  });
  for (const site of ['website', 'docs'] as const) {
    yield* Cloudflare.Website.StaticSite(
      site === 'website' ? 'Website' : 'Docs',
      {
        name: names[site],
        cwd: fileURLToPath(new URL(`../apps/${site}`, import.meta.url)),
        command: 'pnpm build',
        outdir: 'dist',
        env: site === 'docs' ? { SITE_URL: origins.docs } : {},
        domain: { name: config.domains[site], zoneId: config.zoneId },
        workersDev: { enabled: false, previewsEnabled: false },
        assets: { notFoundHandling: '404-page' },
      },
    );
  }
  const database = yield* Database;
  return {
    ...origins,
    operations: {
      databaseId: database.databaseId,
      databaseName: names.database,
      stateWorker: names.state,
    },
  };
});
