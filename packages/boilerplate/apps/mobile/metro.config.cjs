const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const {
  withStorybook,
} = require('@storybook/react-native/metro/withStorybook');

module.exports = withStorybook(getDefaultConfig(__dirname), {
  configPath: path.resolve(__dirname, '.rnstorybook'),
  enabled:
    process.env.NODE_ENV !== 'production' &&
    process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
  docTools: false,
});
