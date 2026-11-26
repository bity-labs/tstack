import { HttpApi, OpenApi } from 'effect/http-api';
import { SystemApi } from './features/system/system.api.js';
import { AccountApi } from './features/account/account.api.js';

export { SystemApi } from './features/system/system.api.js';
export { Health } from './features/system/system.schema.js';
export { AccountApi } from './features/account/account.api.js';
export { User, Unauthorized } from './features/account/account.schema.js';
export { StorageUnavailable } from './lib/http-errors.js';

export class Api extends HttpApi.make('tstack')
  .add(SystemApi)
  .add(AccountApi)
  .annotateMerge(
    OpenApi.annotations({ title: 'TStack API', version: '0.0.0' }),
  ) {}
