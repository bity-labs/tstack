import { expect, it } from '@effect/vitest';
import { OpenApi } from 'effect/http-api';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Api } from '../src/contract.js';
import { startApi } from './api-process.js';

it('serves health through the local Bun runtime after preparing SQLite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-api-'));
  const app = await startApi(join(directory, 'app.sqlite'));
  try {
    const response = await app.handler(new Request('http://localhost/health'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', storage: 'sqlite' });
  } finally {
    await app.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});

it('exports the public contract without a database or server', () => {
  const document = OpenApi.fromApi(Api);
  expect(document.paths['/health']?.get?.operationId).toBe('health');
  expect(document.paths['/health']?.get?.responses['200']).toBeDefined();
});

it('withholds healthy and authenticated responses when storage cannot initialize', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tstack-unavailable-'));
  const app = await startApi(join(directory, 'missing-parent', 'app.sqlite'));
  try {
    for (const path of ['/health', '/me']) {
      const response = await app.handler(
        new Request(`http://localhost${path}`),
      );
      expect(response.status).toBe(503);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.json()).toEqual({
        message: 'Storage is unavailable',
      });
    }
  } finally {
    await app.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
