import { AsyncLocalStorage } from 'node:async_hooks';

// Keep only the portable call signature: Bun's global fetch also exposes
// preconnect(), which a native Worker service binding does not implement.
type ApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

/** Native Worker bindings, with HTTP configuration for local development. */
export interface ApiRuntime {
  API?: { fetch: ApiFetch };
  API_URL?: string;
}

const runtime = new AsyncLocalStorage<ApiRuntime>();

/** Scope bindings to this request; never retain one request's env globally. */
export function withApiRuntime<T>(bindings: ApiRuntime, handle: () => T): T {
  return runtime.run(bindings, handle);
}

export function getApiTransport(): { baseUrl: string; fetch: ApiFetch } {
  const bindings = runtime.getStore();
  if (bindings?.API) {
    return {
      // Service bindings require an absolute URL, but do not use public DNS.
      baseUrl: 'http://api.internal',
      fetch: bindings.API.fetch.bind(bindings.API),
    };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing API service binding');
  }
  return {
    baseUrl:
      bindings?.API_URL ?? process.env.API_URL ?? 'http://127.0.0.1:4000',
    fetch: globalThis.fetch,
  };
}
