import { Config, Effect, Redacted, Schema } from 'effect';

const Port = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 65535 }));

export const apiConfig = Effect.gen(function* () {
  const port = yield* Config.schema(Port, 'PORT').pipe(
    Config.withDefault(4000),
  );
  const filename = yield* Config.String('DATABASE_PATH').pipe(
    Config.withDefault('tstack.sqlite'),
  );
  const webOrigin = yield* Config.String('WEB_ORIGIN').pipe(
    Config.withDefault('http://localhost:3000'),
  );
  const baseURL = yield* Config.String('BETTER_AUTH_URL').pipe(
    Config.withDefault(webOrigin),
  );
  const emailDirectory = yield* Config.String('AUTH_EMAIL_DIRECTORY').pipe(
    Config.withDefault('.local/emails'),
  );
  const secret = yield* Config.Redacted('BETTER_AUTH_SECRET');
  if (Redacted.value(secret).length < 32) {
    return yield* Effect.fail(
      new Error('BETTER_AUTH_SECRET must contain at least 32 characters'),
    );
  }
  return { port, filename, webOrigin, baseURL, secret, emailDirectory };
});
