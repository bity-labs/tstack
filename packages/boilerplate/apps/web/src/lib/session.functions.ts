import { createServerFn } from '@tanstack/react-start';
import {
  getRequestHeaders,
  setResponseHeader,
} from '@tanstack/react-start/server';
import { ApiError, me } from '@tstack/sdk';
import { getApiTransport } from './api-runtime.server';

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    setResponseHeader('cache-control', 'private, no-store');
    try {
      return await me({
        ...getApiTransport(),
        headers: { cookie: getRequestHeaders().get('cookie') ?? '' },
        cache: 'no-store',
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw new Error('Unable to verify your session. Please try again.', {
        cause: error,
      });
    }
  },
);
