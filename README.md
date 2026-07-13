# ArcInvoice Pro

Production-quality Next.js foundation for the ArcInvoice Pro application.

The repository includes a **frontend shell** (App Router UI) and a **backend data foundation** (PostgreSQL + Drizzle ORM). Wallet connection and Arc transactions are **not** implemented yet.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Linting | ESLint (`eslint-config-next`) |
| Package manager | [pnpm](https://pnpm.io) |
| Database | PostgreSQL |
| ORM | [Drizzle](https://orm.drizzle.team) |
| Validation | Zod |
| Tests | Vitest |
| Source layout | `src/` with `@/*` import alias |

## Requirements

- Node.js **22.13+**
- pnpm **9+** (recommended: use the `packageManager` field via [Corepack](https://nodejs.org/api/corepack.html))
- PostgreSQL **14+** (local or hosted)

```bash
corepack enable
corepack prepare pnpm@11.10.0 --activate
```

## Getting started

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Edit DATABASE_URL in .env.local, then apply migrations and seed demo data
pnpm db:migrate
pnpm db:seed

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
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm db:generate` | Generate SQL migrations from the Drizzle schema into `./drizzle` |
| `pnpm db:check` | Validate migration journal / snapshots (`drizzle-kit check`) |
| `pnpm db:migrate` | Apply committed migrations in `./drizzle` to `DATABASE_URL` |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed clearly labelled **demo** data |

## PostgreSQL setup

1. Install and start PostgreSQL locally (or provision a hosted instance).
2. Create an empty database:

   ```bash
   createdb arcinvoice_pro
   # or
   psql -c 'CREATE DATABASE arcinvoice_pro;'
   ```

3. Set `DATABASE_URL` in `.env.local` (see [`.env.example`](./.env.example)):

   ```bash
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/arcinvoice_pro
   ```

4. Apply migrations and (optionally) seed demo data:

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

### Migration commands

Migrations are committed under **`./drizzle`** (SQL + `meta` journal/snapshots). Do not replace this with `drizzle-kit push` for shared environments.

```bash
# After changing files under src/db/schema/
pnpm db:generate

# Validate journal/snapshots
pnpm db:check

# Apply pending migrations in ./drizzle
pnpm db:migrate
```

### Seed command

```bash
pnpm db:seed
```

Seeds **one organization**, **three customers**, and **five invoices**, plus related demo payment intent / reminder / receipt rows. All demo records are labelled `[DEMO]` / `DEMO DATA — not production`. Re-running against an existing demo org is a no-op.

### Test command

```bash
pnpm test
pnpm test:e2e
```

Unit/integration tests cover amount calculations, invoice state transitions, Arc unit systems, and payment-intent preparation. Playwright covers UI flows (including mocked wallet connect).

## Arc Testnet wallet & payment preparation

| Setting | Default |
| --- | --- |
| Chain ID | `5042002` |
| RPC | `https://rpc.testnet.arc.network` (`NEXT_PUBLIC_ARC_RPC_URL`) |
| Explorer | `https://testnet.arcscan.app` (`NEXT_PUBLIC_ARC_EXPLORER_URL`) |
| Faucet | `https://faucet.circle.com` (`NEXT_PUBLIC_ARC_FAUCET_URL`) |
| Native gas | **USDC** (18-decimal balance units) — never ETH |
| ERC-20 USDC interface | 6 decimals (kept separate from native units) |

- Connect injected EVM wallets via **Wagmi + Viem** (no private keys stored).
- Public invoices at `/pay/[token]` can **prepare** a server-side `PaymentIntent` (no broadcast / no receipt yet).
- Configure merchant payout under **Dashboard → Settings** (signed wallet confirmation).
- Issued invoices freeze the merchant payout wallet in `issuedSnapshot.merchant`.

### Environment variables (Arc)

```bash
NEXT_PUBLIC_ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_ARC_EXPLORER_URL=https://testnet.arcscan.app
NEXT_PUBLIC_ARC_FAUCET_URL=https://faucet.circle.com
NEXT_PUBLIC_ARC_NETWORK_LABEL=Arc Testnet
```

See [`.env.example`](./.env.example) for the full list.

## Data model (backend foundation)

Entities (UUID primary keys, `createdAt` / `updatedAt` on all tables):

- Organization, Member, Customer
- Invoice, InvoiceLine
- PaymentIntent, OnchainPayment
- Reminder, Receipt
- AuditEvent

**Money** is stored as **integer base units only** (never floating-point). Invoices track currency, token decimals, subtotal, tax, discount, total, amount paid, amount due, and overpayment fields. Invoice numbers are unique per organization; public payment tokens are random and unique.

Invoice statuses: `draft`, `issued`, `partially_paid`, `paid`, `overdue`, `cancelled`  
Payment intent statuses: `pending`, `submitted`, `confirming`, `settled`, `failed`, `action_required`

Key modules:

- `src/db/client.ts` — database client
- `src/db/schema/` — Drizzle schema (entrypoint: `index.ts`)
- `drizzle/` — committed SQL migrations + journal/snapshots
- `src/repositories/` — organizations, customers, invoices
- `src/lib/domain/amounts.ts` — amount helpers
- `src/lib/domain/invoice-state.ts` — state transition helpers
- `src/lib/validation/schemas.ts` — Zod schemas
- `scripts/seed.ts` — demo seed

## Project structure

```text
arcinvoice-pro/
├── drizzle/                 # Committed migrations (SQL + meta)
├── public/
├── scripts/
│   └── seed.ts
├── src/
│   ├── app/                 # App Router UI
│   ├── components/
│   ├── db/
│   │   ├── client.ts
│   │   └── schema/
│   ├── lib/
│   │   ├── domain/          # amounts, invoice state, tokens
│   │   └── validation/      # Zod schemas
│   └── repositories/
├── drizzle.config.ts
├── vitest.config.ts
├── .env.example
└── package.json
```

### Import alias

```ts
import { getDb } from "@/db/client";
import { calculateInvoiceTotals } from "@/lib/domain/amounts";
```

## Environment variables

See [`.env.example`](./.env.example). Required for database tooling and server data access:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |

Local overrides belong in `.env.local` (gitignored).

## Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## Security

To report a vulnerability, follow [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
