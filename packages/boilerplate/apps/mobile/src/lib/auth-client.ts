import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { getApiUrl } from './api-config';

function createClient() {
  return createAuthClient({
    baseURL: `${getApiUrl()}/api/auth`,
    fetchOptions: { credentials: 'omit' },
    sessionOptions: { refetchInterval: 60 },
    plugins: [
      emailOTPClient(),
      expoClient({
        scheme: 'tstack',
        storagePrefix: 'tstack',
        storage: SecureStore,
        // Persist cookies, but never display a cached session as authenticated.
        disableCache: true,
      }),
    ],
  });
}

let client: ReturnType<typeof createClient> | undefined;

export function getAuthClient() {
  client ??= createClient();
  return client;
}
