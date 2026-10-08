// Expo SDK 57 Metro app; babel-preset-expo is used by jest-expo test transforms.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [require.resolve("babel-preset-expo")]
  };
};
