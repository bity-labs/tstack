import type { StorybookConfig } from '@storybook/tanstack-react';

const config: StorybookConfig = {
  framework: '@storybook/tanstack-react',
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y'],
  viteFinal: (config) => ({
    ...config,
    server: { ...config.server, allowedHosts: true },
  }),
};
export default config;
