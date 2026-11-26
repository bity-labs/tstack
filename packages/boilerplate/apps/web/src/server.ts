import {
  createServerEntry,
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { withApiRuntime, type ApiRuntime } from './lib/api-runtime.server';

const { fetch: handleRequest } = createServerEntry({
  fetch: createStartHandler(defaultStreamHandler),
});
type RuntimeOptions = ApiRuntime &
  NonNullable<Parameters<typeof handleRequest>[1]>;

export default {
  // Alchemy's native Vite Worker passes env here. Plain Vite omits it and
  // uses the local Bun API's HTTP configuration during development.
  fetch(request: Request, env: RuntimeOptions = {}) {
    return withApiRuntime(env, () => handleRequest(request, env));
  },
};
