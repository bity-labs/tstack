export function readApiUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      'Set EXPO_PUBLIC_API_URL to your device-reachable API origin.',
    );
  }
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'EXPO_PUBLIC_API_URL must be an HTTP(S) origin without a path.',
    );
  }
  if (
    !__DEV__ &&
    (url.protocol !== 'https:' ||
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  ) {
    throw new Error(
      'Release builds require a device-reachable HTTPS API origin.',
    );
  }
  return url.origin;
}

export function getApiUrl(): string {
  return readApiUrl(process.env.EXPO_PUBLIC_API_URL);
}
