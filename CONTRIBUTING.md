# Contributing to ArcInvoice Pro

Thank you for your interest in contributing. This guide keeps contributions consistent and reviewable.

## Code of conduct

Be respectful and constructive. Harassment or discrimination of any kind is not tolerated.

## Development setup

1. **Fork** the repository and clone your fork.
2. Ensure **Node.js 20+** and **pnpm 9+** are installed.
3. Install dependencies:

   ```bash
   pnpm install
   ```

4. Copy the environment template if needed:

   ```bash
   cp .env.example .env.local
   ```

5. Start the app:

   ```bash
   pnpm dev
   ```

## Branching and commits

- Create a focused branch from the default branch, for example:
  - `feat/short-description`
  - `fix/short-description`
  - `docs/short-description`
  - `chore/short-description`
- Prefer small, atomic commits with clear messages (imperative mood):
  - `feat: add invoice list empty state`
  - `fix: correct tax calculation rounding`
  - `docs: update security reporting contacts`

## Coding standards

- **TypeScript** — prefer explicit types at public boundaries; avoid `any` unless justified.
- **App Router** — place routes and layouts under `src/app/`.
- **Imports** — use the `@/*` alias for modules under `src/`.
- **Styling** — use Tailwind CSS utility classes; keep global CSS minimal.
- **ESLint** — code must pass `pnpm lint` with no errors.
- **No secrets** — never commit `.env`, API keys, tokens, or credentials.

## Before you open a pull request

Run the following and ensure they succeed:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Then:

1. Open a PR against the default branch with a clear title and description.
2. Describe **what** changed and **why**.
3. Link related issues when applicable.
4. Note any intentional scope limits or follow-up work.

## Pull request review

- Maintainers may request changes for clarity, tests, or architecture fit.
- Address feedback with additional commits (or a squash if maintainers prefer).
- Merges happen when checks pass and at least one maintainer approves (policy may evolve).

## Reporting bugs

Open an issue with:

- Expected vs actual behavior
- Steps to reproduce
- Environment (OS, Node, pnpm, browser if relevant)
- Logs or screenshots when helpful

For security-sensitive reports, use the process in [SECURITY.md](./SECURITY.md) instead of a public issue.

## Feature requests

Open an issue describing the problem, proposed solution, and alternatives considered. Agreement on scope before large implementation PRs is appreciated.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](./LICENSE).
