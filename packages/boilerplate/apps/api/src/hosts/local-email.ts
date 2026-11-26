import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AuthOptions } from '../lib/auth.js';

/** Local-only mailbox. Never expose these credential-bearing files over HTTP. */
export const localEmail =
  (directory: string): NonNullable<AuthOptions['sendEmail']> =>
  async (message) => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(
      join(directory, `${randomUUID()}.json`),
      JSON.stringify(message, null, 2),
      {
        flag: 'wx',
        mode: 0o600,
      },
    );
  };
