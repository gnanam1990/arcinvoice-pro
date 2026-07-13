# ArcInvoice Pro

Production-quality Next.js foundation for the ArcInvoice Pro application.

This repository is currently a **scaffold only** — tooling, project structure, and documentation are in place. Product features will be added in subsequent work.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Linting | ESLint (`eslint-config-next`) |
| Package manager | [pnpm](https://pnpm.io) |
| Source layout | `src/` with `@/*` import alias |

## Requirements

- Node.js **20+**
- pnpm **9+** (recommended: use the `packageManager` field via [Corepack](https://nodejs.org/api/corepack.html))

```bash
corepack enable
corepack prepare pnpm@11.10.0 --activate
```

## Getting started

```bash
# Install dependencies
pnpm install

# Copy environment template (optional until secrets are needed)
cp .env.example .env.local

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start Next.js in development mode |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Run ESLint and auto-fix issues |
| `pnpm typecheck` | Run TypeScript (`tsc --noEmit`) |

## Project structure

```text
arcinvoice-pro/
├── public/                 # Static assets
├── src/
│   └── app/                # App Router routes, layouts, and styles
├── .env.example            # Documented environment variable template
├── CONTRIBUTING.md         # Contribution guidelines
├── SECURITY.md             # Security policy
├── LICENSE                 # MIT
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
└── tsconfig.json           # Includes paths: "@/*" → "./src/*"
```

### Import alias

TypeScript and the bundler resolve `@/*` to `./src/*`:

```ts
import { Example } from "@/components/example";
```

## Environment variables

See [`.env.example`](./.env.example) for the full list. Local overrides belong in `.env.local` (gitignored).

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

To report a vulnerability, follow [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
