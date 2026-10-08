# @tstack/cli

Retained customer-facing TStack CLI. V2 scaffolding is not implemented yet: `tstack init` exits with an explanatory message. `ready` and `products` retain legacy configuration behavior for existing compatible projects; they are not a v2 setup workflow.

## Local development

From the repository root:

```sh
pnpm tstack --help
pnpm --filter @tstack/cli build
pnpm --filter @tstack/cli test
```

From this package directory:

```sh
pnpm build
pnpm test
```

## Optional global link

The CLI is private and is not published to public npm. To build and link it from this checkout:

```sh
pnpm run setup
```

Run this from the repository root. Keep the checkout on disk while using the linked command. Linking does not enable v2 scaffolding. Remove the link with `pnpm tstack:unlink` from the root.

## User documentation

See the [CLI reference](../../apps/documentation/content/docs/reference/cli.mdx) for current command status and the [preserved v1 documentation](https://github.com/bity-labs/tstack/tree/v1/apps/documentation/content/docs) for the previous starter.
