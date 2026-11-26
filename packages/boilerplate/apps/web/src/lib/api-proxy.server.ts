import { getApiTransport } from './api-runtime.server';

export async function proxyApiRequest(request: Request): Promise<Response> {
  const transport = getApiTransport();
  const url = new URL(request.url);
  const upstream = new URL(transport.baseUrl);
  upstream.pathname = url.pathname.startsWith('/api/auth/')
    ? url.pathname
    : url.pathname.slice('/api'.length);
  upstream.search = url.search;
  const headers = new Headers();
  for (const name of [
    'accept',
    'content-type',
    'cookie',
    'origin',
    'referer',
    'sec-fetch-site',
    'sec-fetch-mode',
    'sec-fetch-dest',
    'user-agent',
    'cf-connecting-ip',
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const response = await transport.fetch(upstream, {
    method: request.method,
    headers,
    body: request.method === 'GET' ? undefined : await request.arrayBuffer(),
    signal: request.signal,
    redirect: 'manual',
  });
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');
  responseHeaders.set('cache-control', 'no-store');
  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
