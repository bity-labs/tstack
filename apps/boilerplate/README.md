<p align="center">
  <img src="public/android-chrome-512x512.png" alt="TStack Agent-Ready Boilerplate" width="120" height="120">
</p>

<h1 align="center">TStack Agent-Ready Boilerplate</h1>

<p align="center">
  A production-ready Next.js 15 starter with authentication, payments, email, and agent-facing engineering conventions.
</p>

---

## Get Started

This app is the boilerplate layer of TStack. Until a scaffold command exists, start from the monorepo source:

```bash
git clone https://github.com/bity-labs/tstack my-app
cd my-app
pnpm install
pnpm --filter @tstack/boilerplate dev
```

If you copy this app into a standalone repository, keep the TStack Engineering Harness docs with it and update the placeholders below for your product.

## Shared TStack Harness

Inside the TStack monorepo, this app dogfoods the shared harness instead of duplicating it:

- `AGENTS.md` links to `../../packages/harness/templates/default/AGENTS.md`
- `.agents` links to `../../packages/harness/templates/default/.agents`
- `docs/engineering` links to `../../../packages/harness/templates/default/docs/engineering`

Boilerplate-specific context and standards remain real files in `docs/context.md`, `docs/coding-standards.md`, and `docs/adr/`.

## Rebranding

This boilerplate uses `myapp` (slug) and `MyApp` (display name) as placeholders. Replace them with your own project name:

```bash
# Replace display name (e.g., "My Cool App")
grep -rl "MyApp" . --exclude-dir={node_modules,.git} | xargs sed -i 's/MyApp/Your App Name/g'

# Replace slug (e.g., "mycoolapp")
grep -rl "myapp" . --exclude-dir={node_modules,.git} | xargs sed -i 's/myapp/yourslug/g'
```

> **Note:** If your project name contains regex special characters (`.`, `*`, `+`, etc.), escape them in the sed commands.

## Documentation

TStack documentation lives in the repository documentation app: <https://github.com/bity-labs/tstack/tree/main/apps/documentation>.
