export class ApiError<T = unknown> extends Error {
  constructor(
    public readonly status: number,
    public readonly data: T,
  ) {
    super(`API request failed (${status})`);
    this.name = 'ApiError';
  }
}

export type ErrorType<T> = ApiError<T>;
export type RequestOptions = RequestInit & {
  baseUrl?: string;
  // Use the portable callable, not Bun's fetch type with its preconnect member.
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    baseUrl = '/api',
    fetch: transport = globalThis.fetch,
    ...init
  } = options;
  const response = await transport(`${baseUrl.replace(/\/$/, '')}${path}`, {
    credentials: 'include',
    ...init,
  });
  const data: unknown =
    response.status === 204 ? undefined : await response.json();
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}
