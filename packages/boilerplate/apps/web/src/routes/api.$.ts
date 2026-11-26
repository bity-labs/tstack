import { createFileRoute } from '@tanstack/react-router';
import { proxyApiRequest } from '../lib/api-proxy.server';

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      GET: ({ request }) => proxyApiRequest(request),
      POST: ({ request }) => proxyApiRequest(request),
    },
  },
});
