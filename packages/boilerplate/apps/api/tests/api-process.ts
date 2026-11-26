import { spawn } from 'node:child_process';
import { once } from 'node:events';

export async function startApi(filename: string) {
  const child = spawn('bun', ['--no-env-file', 'src/main.ts'], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '0',
      DATABASE_PATH: filename,
      AUTH_EMAIL_DIRECTORY: `${filename}.emails`,
      BETTER_AUTH_SECRET: 'test-secret-only-not-for-production-8326',
      BETTER_AUTH_URL: 'http://localhost:3000',
      WEB_ORIGIN: 'http://localhost:3000',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Bun API startup timed out')),
        15_000,
      );
      let output = '';
      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.on('exit', () => {
        clearTimeout(timeout);
        reject(new Error(`Bun API exited before listening: ${stderr}`));
      });
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        const lines = output.split('\n');
        output = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('{')) continue;
          const event = JSON.parse(line) as { event?: string; url?: string };
          if (event.event === 'listening' && event.url) {
            clearTimeout(timeout);
            resolve(event.url);
          }
        }
      });
    });
    return {
      handler: (request: Request) => {
        const path = new URL(request.url);
        return fetch(
          new Request(`${url}${path.pathname}${path.search}`, request),
          { redirect: 'manual' },
        );
      },
      dispose: async () => {
        child.kill('SIGTERM');
        await exited;
      },
    };
  } catch (error) {
    child.kill('SIGTERM');
    await exited;
    throw error;
  }
}
