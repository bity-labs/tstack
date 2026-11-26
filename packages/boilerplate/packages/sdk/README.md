# SDK

Orval-generated TypeScript API client. Import HTTP functions and models from `@tstack/sdk`; import TanStack Query hooks from `@tstack/sdk/react`. The HTTP entry point does not import React. The package is private and consumed as TypeScript source by this workspace; `build` also emits JavaScript and declarations for validation. External publication requires a separate packaging/release decision.

## Generation

Run from the boilerplate root (`packages/boilerplate` when developing inside TStack):

```sh
pnpm generate
pnpm --filter @tstack/sdk test
```

The root generation pipeline exports OpenAPI from Effect first, without starting the API or opening SQLite, then runs Orval. Generated files in `src/generated` are versioned. Never edit them by hand. CI regenerates them and checks for drift. During root development, the contract exporter and Orval watch their respective inputs.

## Usage

```ts
import { health } from '@tstack/sdk';

const result = await health({ baseUrl: 'https://api.example.com' });
```

Browser requests default to the same-origin `/api` prefix. The web server proxies this prefix to the API. Other clients supply an absolute `baseUrl`. Pass request-specific headers, credentials, an abort signal or an injected fetch transport through request options; no user token or transport is stored globally. The deployed web server injects the native API Worker service-binding fetch through this seam; browsers/native/MCP keep ordinary HTTP fetch. HTTP errors throw `ApiError` with status and response data so TanStack Query reports errors. Generated TypeScript types are not runtime response validation.

Both generated entry points use the transport in `src/http.ts`. The React output includes its own generated HTTP functions as part of Orval's hook output; both are derived from the same contract rather than maintained independently.

## Transport ownership

`src/http.ts` is handwritten and registered as Orval's `request` mutator in `orval.config.ts`. Regeneration replaces the generated operations and models, not this transport. Keep this small boundary responsible for the runtime base URL, default credentials, JSON decoding and the shared `ApiError` contract; do not turn it into a second API client or put provider detection in generated operations.

The custom mutator keeps runtime URL configuration, credentials and the existing error contract consistent across generated operations. Generated output remains unchanged when the transport implementation changes.

The caller supplies the API URL and request options, including a request-scoped fetch override where needed. The server-only [web API configuration](../../apps/web/src/lib/api-runtime.server.ts) selects the native API Worker binding when deployed and `API_URL` for local HTTP development. It never changes global fetch or stores session credentials globally. Missing deployed bindings must fail closed rather than silently falling back to HTTP. Keep provider detection in the server composition, not generated operations or browser bundles.

| Caller             | Transport                                                                     |
| ------------------ | ----------------------------------------------------------------------------- |
| Browser            | Standard fetch to same-origin `/api`; the web server proxies to the API.      |
| Web server         | Native Worker service-binding fetch when deployed; fixed HTTP origin locally. |
| Native application | Standard fetch to its configured public HTTPS API origin.                     |

This transport is for business endpoints, including `/me`. Better Auth sign-up, sign-in, session refresh and sign-out continue to use the official specialized clients and the web auth proxy, not generated replacements for the auth protocol.
