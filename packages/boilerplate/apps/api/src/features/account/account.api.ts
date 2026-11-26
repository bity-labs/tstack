import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from 'effect/http-api';
import { StorageUnavailable } from '../../lib/http-errors.js';
import { Unauthorized, User } from './account.schema.js';

export class AccountApi extends HttpApiGroup.make('account', {
  topLevel: true,
}).add(
  HttpApiEndpoint.get('me', '/me', {
    success: User,
    error: [
      Unauthorized.pipe(HttpApiSchema.status(401)),
      StorageUnavailable.pipe(HttpApiSchema.status(503)),
    ],
  }).annotate(
    OpenApi.Description,
    'Returns the current user. Requires a valid Better Auth session cookie.',
  ),
) {}
