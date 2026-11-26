import { readApiUrl } from './api-config';

it('requires explicit configuration with no localhost fallback', () => {
  expect(() => readApiUrl(undefined)).toThrow('EXPO_PUBLIC_API_URL');
  expect(() => readApiUrl('')).toThrow('EXPO_PUBLIC_API_URL');
});

it('normalizes a device-reachable API origin', () => {
  expect(readApiUrl(' https://api.example.com/ ')).toBe(
    'https://api.example.com',
  );
});

it.each([
  'ftp://api.example.com',
  'https://api.example.com/api',
  'https://user:pass@api.example.com',
  'https://api.example.com?key=value',
])('rejects unsafe or ambiguous configuration: %s', (url) => {
  expect(() => readApiUrl(url)).toThrow();
});

it('rejects HTTP and loopback origins in release builds', () => {
  const previous = __DEV__;
  Object.defineProperty(globalThis, '__DEV__', {
    value: false,
    configurable: true,
  });
  try {
    expect(() => readApiUrl('http://192.168.1.100:3000')).toThrow('HTTPS');
    expect(() => readApiUrl('https://localhost:3000')).toThrow(
      'device-reachable',
    );
    expect(readApiUrl('https://api.example.com')).toBe(
      'https://api.example.com',
    );
  } finally {
    Object.defineProperty(globalThis, '__DEV__', {
      value: previous,
      configurable: true,
    });
  }
});
