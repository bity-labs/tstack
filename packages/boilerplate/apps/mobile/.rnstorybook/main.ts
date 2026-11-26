import type { StorybookConfig } from '@storybook/react-native';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  deviceAddons: ['@storybook/addon-ondevice-controls'],
};

export default config;
