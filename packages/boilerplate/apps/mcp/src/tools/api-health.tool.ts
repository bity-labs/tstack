import { McpServer, type ServerContext } from '@modelcontextprotocol/server';
import { Effect } from 'effect';
import { health } from '@tstack/sdk';

export function registerApiHealthTool(server: McpServer, baseUrl: string) {
  server.registerTool(
    'api_health',
    {
      title: 'API health',
      description:
        'Check whether the configured TStack API and its SQLite storage are reachable. Returns status and storage; does not modify data.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (context: ServerContext) =>
      Effect.runPromise(
        Effect.tryPromise(() =>
          health({
            baseUrl,
            signal: AbortSignal.any([
              context.mcpReq.signal,
              AbortSignal.timeout(5_000),
            ]),
          }),
        ).pipe(
          Effect.match({
            onFailure: () => ({
              isError: true,
              content: [
                {
                  type: 'text' as const,
                  text: 'The configured API could not be reached or returned an error.',
                },
              ],
            }),
            onSuccess: (result) => ({
              content: [
                { type: 'text' as const, text: JSON.stringify(result) },
              ],
              structuredContent: { ...result },
            }),
          }),
        ),
      ),
  );
}
