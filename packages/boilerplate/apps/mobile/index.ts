import type { ComponentType } from 'react';
import { registerRootComponent } from 'expo';

import App from './App';

let Root: ComponentType = App;

// Keep the native workbench unreachable in release builds, even with the flag set.
if (__DEV__ && process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Load only after the development guard.
  Root = require('./.rnstorybook').default;
}

registerRootComponent(Root);
