module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Native presets can otherwise resolve the web workspace's React peer copy.
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(?:jest-)?react-native|@react-native(?:-community)?|expo(?:nent)?|@expo(?:nent)?/|react-native-safe-area-context))',
  ],
};
