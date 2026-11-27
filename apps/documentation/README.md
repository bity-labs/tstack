# TStack Documentation

Fumadocs documentation app for the TStack Engineering Harness.

Run from the repository root:

```sh
pnpm dev:documentation
```

Or run the workspace directly:

```sh
pnpm --filter @tstack/documentation dev
```

## Cloudflare Workers

Use Node.js 22.12+ and pnpm from the repository root:

```sh
pnpm --filter @tstack/documentation build:vinext
pnpm --filter @tstack/documentation start:vinext
```

After Cloudflare CLI authentication, set `CLOUDFLARE_ACCOUNT_ID` and run
`pnpm --filter @tstack/documentation deploy:vinext`. In CI, provide
`CLOUDFLARE_API_TOKEN` as a secret. `cloudflare.config.ts` defines `tstack-docs`;
`vite.config.ts` compiles Fumadocs MDX for Workers. The original Next.js scripts
remain available. No database or storage binding is required. Build output
is ignored. The repository has no `/api/search` route; the migration does not
add one.

The configuration includes the exact production route `doc.tstack.dev/*`,
without changing DNS or the tunnel. Deploy credentials need Workers Scripts
edit, Workers Routes edit, and Zone read permissions.
