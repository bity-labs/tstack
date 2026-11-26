import { defineConfig } from 'orval';

const input = '../../apps/api/generated/openapi.json';
const mutator = { path: './src/http.ts', name: 'request' };

export default defineConfig({
  http: {
    input,
    output: {
      target: './src/generated/http.ts',
      schemas: './src/generated/models',
      client: 'fetch',
      override: { mutator, fetch: { includeHttpResponseReturnType: false } },
    },
  },
  react: {
    input,
    output: {
      target: './src/generated/react.ts',
      schemas: './src/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      override: { mutator, fetch: { includeHttpResponseReturnType: false } },
    },
  },
});
