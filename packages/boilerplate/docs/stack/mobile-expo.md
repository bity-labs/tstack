# Expo native application

`App.tsx` and `index.ts` remain Expo entry points. The native authentication UI lives in `src/features/authentication/screens/auth-screen.tsx`, exposed through the feature's `index.ts`. Generic native components such as `welcome.tsx` stay in `src/components`; they are not web DOM components.

## Platform integrations

- `src/lib/auth-client.ts` lazily creates the official Better Auth Expo client with SecureStore persistence. Keep native credential handling separate from browser cookies; read the [auth guide](auth-guide.md) before changing it.
- `src/lib/api-config.ts` requires an explicit device-reachable `EXPO_PUBLIC_API_URL`. Release configurations require HTTPS and reject loopback. A browser portal does not establish native device networking.
- Business calls use `@tstack/sdk`; current profile fetching sends the official client's cookie with `credentials: 'omit'`. Never import API implementations or web feature components.
- Do not add Expo Router or another navigation framework solely to imitate the browser routes. Introduce navigation when the product has multiple screen requirements.

## Tests and stories

Colocate `auth-screen.test.tsx` and other native tests with their subject. Use Jest with `jest-expo` and React Native Testing Library. Preserve expiry/revocation checks and failed-logout retry behavior during structural refactors; mocks do not establish native storage/network behavior.

Native stories use `.stories.tsx` next to native components; `.rnstorybook` is the independent on-device catalog. `pnpm storybook:mobile` enables it only for development. Keep Metro and entry-point production guards intact, including when a Storybook flag is accidentally set in a release environment.

`pnpm --filter @tstack/mobile build` exports JavaScript/Hermes for both iOS and Android, not native binaries or signing. Supply the documented explicit API origin. Jest, bundling and Storybook exports do not replace simulator/device validation; no native screenshot is required merely to rename modules.

## Deployment boundary

The [Cloudflare-only deployment](deployment.md) runs API/web Workers, D1 and static sites; it does not deploy or sign native binaries and introduces no EAS pipeline. Configure the native client's explicit device-reachable HTTPS API origin for that stage, never an internal Worker service-binding request URL or local development address, while keeping the official Expo auth client and ordinary HTTP SDK boundary. Native clients do not use the web→API service binding. The current failed-logout retry survives only in memory, not across app termination; backend adapter changes do not make revocation durable across restarts. See the [auth guide](auth-guide.md) for the lifecycle contract.
