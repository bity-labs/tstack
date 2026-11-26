# Mobile

Expo / React Native application (`@tstack/mobile`) for iOS and Android, with
email/password Better Auth sign-up, sign-in, session restoration, sign-out, native
Storybook, and Jest tests. The standard `registerRootComponent` entry renders
`App.tsx`; authentication changes the screen without a navigation library.

## Source layout

- `src/features/authentication/index.ts` exposes `AuthScreen` from
  `screens/auth-screen.tsx`; its behavioral tests stay beside the screen.
- `src/lib/auth-client.ts` configures the native Better Auth client, and
  `src/lib/api-config.ts` validates the public API origin.
- `src/components/welcome.tsx` is a standalone native UI example with colocated
  tests and stories. Native UI remains separate from the web application.
- Source files use kebab-case; Expo's `App.tsx`/`index.ts` entry points and the
  `.rnstorybook` directory keep their framework-required names.

## Requirements and installation

- Node.js 24 or newer and the repository's pinned pnpm 10 version.
- Install **from the boilerplate root** with `pnpm install`. Inside TStack, this
  means `packages/boilerplate`, not the outer repository root. Keep development
  dependencies installed for Metro, Storybook, tests, and exports.
- For interactive native use, a physical device with an Expo Go version that
  supports SDK 58, or a compatible development build. A locally configured iOS
  simulator requires macOS and Xcode; Android requires a configured device or
  Android SDK. Browser device emulation is not native testing.

The SDK versions come from the official `create-expo-app@5.0.0`
`blank-typescript@sdk-58` template and `expo install` compatibility resolution:
Expo `~58.0.26`, React `19.3.0`, and React Native `0.88.1`. Native Storybook is
`10.7.2`, with its compatible `storybook` core `10.6.8`. Gesture Handler,
Reanimated, Worklets, Safe Area Context, SVG, AsyncStorage, React DOM, and Bottom
Sheet fulfill the native Storybook UI dependencies. React DOM is not a web target.

The mobile workspace uses Expo's recommended TypeScript `6.0.3`. Other workspaces
currently use TypeScript `5.9.3`; both consume the same strict base settings.

## Commands

Run these from the boilerplate root after installation:

| Command                                                  | Purpose                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm --filter @tstack/mobile dev`                       | Start the ordinary Expo development server.                                           |
| `pnpm --filter @tstack/mobile dev --ios`                 | Start Expo and open a configured iOS simulator.                                       |
| `pnpm --filter @tstack/mobile dev --android`             | Start Expo and open a configured Android device/emulator.                             |
| `pnpm --filter @tstack/mobile storybook`                 | Start Expo with the native Storybook UI explicitly enabled and Metro's cache cleared. |
| `pnpm --filter @tstack/mobile storybook --ios`           | Open native Storybook on a configured iOS simulator.                                  |
| `pnpm --filter @tstack/mobile storybook --android`       | Open native Storybook on a configured Android device/emulator.                        |
| `pnpm --filter @tstack/mobile storybook:generate`        | Regenerate native story imports without starting Metro.                               |
| `pnpm --filter @tstack/mobile lint`                      | Run the shared ESLint 10 / typescript-eslint configuration.                           |
| `pnpm --filter @tstack/mobile typecheck`                 | Generate story imports, then run TypeScript without emitting files.                   |
| `pnpm --filter @tstack/mobile test`                      | Run all mobile-local unit and component tests once with Jest.                         |
| `pnpm --filter @tstack/mobile test --watch`              | Run Jest in watch mode.                                                               |
| `pnpm --filter @tstack/mobile test --coverage`           | Run Jest and write coverage to `apps/mobile/coverage/`.                               |
| `pnpm --filter @tstack/mobile build`                     | Export production iOS and Android JavaScript/Hermes bundles into `apps/mobile/dist/`. |
| `pnpm --filter @tstack/mobile exec expo install --check` | Check Expo's dependency recommendations.                                              |

The root Turbo scripts also discover this package's `dev`, `build`, `lint`,
`typecheck`, and `test` tasks. `build` is **not** a native binary build: it does not
produce an APK, AAB, or IPA, sign an application, or submit anything to a store.
Native builds/distribution require separate platform and signing configuration;
no EAS project, credentials, or native application identifiers are configured.

On a remote orb, the development server must be exposed using the repository's
supervised services/portal mechanism. A browser portal alone is not a substitute
for a native device's ability to reach Metro; device/tunnel networking must be
configured for the environment. No native emulator is supplied by this package.

## Configuration and native Storybook

- `app.json` defines the app name, slug, light appearance, native platforms,
  `tstack` URL scheme, and SecureStore config plugin.
- `tsconfig.json` combines Expo's React Native settings with
  `@tstack/typescript-config/base.json`. `eslint.config.mjs` uses
  `@tstack/eslint-config`.
- `metro.config.cjs` starts from Expo's monorepo-aware Metro defaults and wraps
  them with `@storybook/react-native/metro/withStorybook`. No custom pnpm
  hoisting, hand-written `watchFolders`, Babel preset, or module alias is needed.
- `index.ts` lazily loads `.rnstorybook` only when **both** `__DEV__` is true and
  `EXPO_PUBLIC_STORYBOOK_ENABLED` is exactly `true`. This is a public build-time
  flag, not a secret or remotely controlled feature flag.
- Metro additionally disables Storybook whenever `NODE_ENV=production` and
  replaces Storybook modules with empty/stub modules when disabled. The `build`
  script explicitly sets production mode and sets the Storybook flag to false.
- `storybook` enables the flag only for that process and disables Storybook
  telemetry. Stop Metro before switching modes. Return to the app with
  `pnpm --filter @tstack/mobile dev --clear`; remove any manually configured
  Storybook flag from your shell or local environment files.
- `.rnstorybook/main.ts` discovers `src/**/*.stories.tsx` and enables on-device
  controls. `.rnstorybook/preview.tsx` holds global story parameters.
  `.rnstorybook/index.tsx` mounts the native UI with gesture/safe-area providers
  and persists story selection using AsyncStorage. There is no browser
  Storybook server, static Storybook site, or remote WebSocket/MCP server.
- Metro generates `.rnstorybook/storybook.requires.ts` automatically when
  Storybook is enabled. It is ignored by Git and regenerated during typecheck,
  so a clean checkout does not need to commit machine-generated story imports.
- `welcome.stories.tsx` contains default and long-copy examples. Select a story
  in the native workbench and use Controls to edit its English copy.

### API and authentication configuration

Copy `apps/mobile/.env.example` to `apps/mobile/.env.local`, then replace the
example `EXPO_PUBLIC_API_URL` with the **API origin**, for example
`https://api.example.com` (no `/api` path). This public Expo build-time variable
is not a secret. Restart Metro after changing it. Missing or invalid configuration
shows an explicit setup error rather than silently contacting localhost.

For device development, use an API address the device can reach: a LAN IP with
the API listening on an accessible interface, or an HTTPS development endpoint.
The example LAN IP is a placeholder, not an automatically available service.
The device's localhost is the device itself, not your development machine or
orb. Native platform cleartext policies may reject HTTP; prefer HTTPS or configure
a development build appropriately. Release builds require HTTPS and reject
loopback origins. Supply this variable in the environment used for release export
or native builds as well as development.

The API must expose Better Auth at `/api/auth`, enable email/password auth, add
the server-side `@better-auth/expo` plugin, and trust the `tstack://` native origin.
The native client explicitly supplies this scheme, so email/password auth does
not rely on an Expo Go redirect origin. Custom URL-scheme handling itself needs
a development/standalone native build; no social redirect flows are implemented.

`src/lib/auth-client.ts` uses official `better-auth` and `@better-auth/expo` 1.7.27.
SecureStore persists session cookies. `disableCache: true` disables optimistic
cached session data, **not cookie persistence**: on restart, `useSession` validates
the stored cookie against the server before showing an account. The Expo plugin
supplies native origin/cookie headers. Auth fetches use `credentials: 'omit'`.
SecureStore, Network, Linking, Constants, and WebBrowser versions follow Expo
58's installed `bundledNativeModules.json`; the plugin uses the latter libraries
internally even though this app has no social-login UI.

The account screen calls generated `@tstack/sdk`'s `me` operation at the API root
(`/me`), passing `getCookie()` as the `Cookie` header, the explicit API base URL,
and `credentials: 'omit'` so native cookie handling does not overwrite it. It
never imports backend code. The API remains the authorization boundary. A 401
hides protected content and returns to sign-in; network failures show retry
states rather than trusting a cached profile. Sessions revalidate every 60 seconds
while online and on native focus/connectivity changes. Known expiry immediately
hides the profile; server-side revocation is discovered at the next revalidation,
not through a push notification.

Sign-out hides the account immediately. Since the official Expo plugin clears
its persisted cookie before sending sign-out, the screen retains the original
credential **only in memory** until the server confirms revocation. A failed
request offers retry with that credential and blocks another sign-in until it
completes. Closing the application during an unconfirmed sign-out loses this
retry credential: local cookies have been cleared, but server revocation is not
guaranteed; the session remains subject to server expiry. No pending logout token
is written to ordinary storage or logs.

Native Storybook stays independent of authentication and the API: it mounts its
own existing workbench, does not render `AuthScreen`, and needs no API URL or
session. The welcome stories are retained as standalone UI examples.

Storybook is unreachable and its JavaScript is excluded from production bundles;
its native supporting dependencies remain installed/available in a native
runtime. This is not a guarantee that a future native binary strips every unused
native library.

## Email-code access

The authentication screen also offers passwordless email codes through the official `emailOTPClient()` alongside the unchanged SecureStore-backed Expo plugin. Request a code, enter six digits, resend, change the email or return to passwords. Inputs support native one-time-code autofill; actual OS autofill still needs device testing. Requests and verification disable duplicate actions and surface recoverable errors. Existing unconfirmed-logout blocking applies to code sign-in too.

The API owns generation, hashing, five-minute expiry, three attempts, throttling and session creation. Local development captures emails privately in the API's mailbox directory; the mobile app never reads mailbox files or a database. Deployed delivery uses Cloudflare Email Sending. Read the [email-code policy](../../docs/stack/auth-guide.md#email-code-access), especially the native Better Auth cleanup of an unverified account's old passwords and sessions on first email ownership proof.

## Tests and limitations

All tests local to this mobile application use **Jest 30 with `jest-expo` 58**.
`@react-native/jest-preset` is explicit because SDK 58 moved React Native's Jest
preset into its own package. React Native Testing Library 14 uses `test-renderer`,
not deprecated `react-test-renderer`. Rendering and interactions are asynchronous
in this version; await them in tests.

- `src/components/welcome.test.tsx` checks the accessible heading and default
  and custom copy with React Native Testing Library.
- `src/features/authentication/screens/auth-screen.test.tsx` covers restoration pending state, signed-out
  and signed-in screens, sign-in/sign-up payloads, duplicate submission pending
  state, validation/auth/network errors, SDK cookie options, revoked sessions,
  profile retry, sign-out, and failed revalidation. Auth/native and SDK boundaries
  are mocked; these are behavioral component tests, not a live API/device test.
- `src/lib/api-config.test.ts` checks explicit URL configuration and release safety.
- `jest.config.cjs` restricts discovery to `*.test.ts(x)`/`*.test.js(x)`, avoids
  exports, and allows the necessary Expo/React Native transforms through pnpm's
  `.pnpm` layout. It pins Jest React resolution to this workspace's copy to avoid
  web/native peer-version hook mismatches. Add mobile-local tests here, not Vitest.

Jest uses mocked native modules. Successful tests and iOS/Android Metro exports
do not prove rendering, gestures, animation, safe-area behavior, or Storybook
interaction on a real device. Verify those separately on a supported native
runtime. This package deliberately does not configure a web target, E2E runner,
native device automation, or email delivery. Device testing is still needed to verify real SecureStore persistence,
network reachability, keyboard/accessibility behavior, and native lifecycle events.

### References

- [Expo unit testing and SDK 58 migration](https://docs.expo.dev/develop/unit-testing/)
- [Native Storybook manual integration](https://storybookjs.github.io/react-native/docs/intro/getting-started/manual-setup/)
- [Expo monorepo support](https://docs.expo.dev/guides/monorepos/)
