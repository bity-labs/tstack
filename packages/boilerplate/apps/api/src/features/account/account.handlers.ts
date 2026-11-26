import { Effect } from 'effect';
import { RuntimeContext } from 'alchemy';
import { HttpApiBuilder } from 'effect/http-api';
import { HttpServerRequest } from 'effect/http';
import { Api } from '../../contract.js';
import { Auth } from '../../lib/auth.js';
import { StorageUnavailable } from '../../lib/http-errors.js';
import { Unauthorized, User } from './account.schema.js';

export const AccountHandlers = HttpApiBuilder.group(
  Api,
  'account',
  Effect.fnUntraced(function* (handlers) {
    const auth = yield* Auth;
    return handlers.handle('me', () =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const session = yield* auth.api
          .getSession({
            headers: new Headers(request.headers),
            query: { disableCookieCache: true, disableRefresh: true },
          })
          .pipe(
            Effect.provide(RuntimeContext.phantom),
            Effect.mapError(
              () =>
                new StorageUnavailable({ message: 'Storage is unavailable' }),
            ),
            Effect.catchDefect(() =>
              Effect.fail(
                new StorageUnavailable({ message: 'Storage is unavailable' }),
              ),
            ),
          );
        if (!session)
          return yield* new Unauthorized({ message: 'Sign in to continue' });
        return new User(session.user);
      }),
    );
  }),
);
