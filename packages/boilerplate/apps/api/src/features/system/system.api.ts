import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from 'effect/http-api';
import { StorageUnavailable } from '../../lib/http-errors.js';
import { Health } from './system.schema.js';

export class SystemApi extends HttpApiGroup.make('system', {
  topLevel: true,
}).add(
  HttpApiEndpoint.get('health', '/health', {
    success: Health,
    error: StorageUnavailable.pipe(HttpApiSchema.status(503)),
  }),
) {}
