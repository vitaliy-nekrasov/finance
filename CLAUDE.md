# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Private family-finance PWA: upload PrivatBank and monobank Excel statements, see a monthly overview, categories and a transaction list. Next.js 16 (App Router), React 19, Postgres (Neon) via Drizzle, Tailwind 4. UI text and user-facing error messages are in Russian. Design spec and implementation plan: `docs/superpowers/specs/` and `docs/superpowers/plans/`.

Next.js 16 differs from older versions: request middleware lives in `src/proxy.ts` (exported function `proxy`, not `middleware`). Check `node_modules/next/dist/docs/` before using Next APIs.

## Commands

```bash
npm ci                                  # install (works on Node 20 / npm 9)
npm run dev                             # dev server; without DATABASE_URL uses local PGlite in ./.pglite
npm run build
npm run lint                            # eslint
npx tsc --noEmit                        # type check
npm test                                # vitest run (tests/**/*.test.ts)
npx vitest run tests/lib/dedup.test.ts  # single file
npx vitest run -t "name of test"        # single test by name
npx drizzle-kit generate                # new migration after editing src/db/schema.ts
DATABASE_URL='postgres://…' npx drizzle-kit migrate   # drizzle-kit does not read .env
npx tsx scripts/hash-password.ts '<password>'         # value for AUTH_PASSWORD_HASH
```

Env (`.env.local`, see `.env.example`): `DATABASE_URL` (required in production only), `AUTH_USERNAME`, `AUTH_PASSWORD_HASH`, `SESSION_SECRET` (≥ 32 bytes).

## Architecture

**Upload pipeline** (`src/app/api/upload/route.ts`): file → `parseStatement` (`src/lib/statement/`) → `ingestStatement` (`src/db/repo.ts`).
- `parseStatement` reads the first sheet with SheetJS into raw rows and detects the bank by header (`findMonoHeader` / Privat's `Дата` + `Опис операції`), dispatching to `parseMono` / `parsePrivat`. Both produce a `ParsedStatement` (`types.ts`): amounts are signed integer kopecks in card currency, `occurredAt` is a Kyiv wall-time string `YYYY-MM-DDTHH:mm:ss` (no time zone anywhere; `src/lib/internal.ts` parses it as UTC on purpose). Unrecognized input throws `StatementError` with a user-facing message.
- `ingestStatement` runs in one transaction: inserts the `uploads` row, upserts `accounts`, assigns `dedupKey` (`src/lib/dedup.ts`: sha256 of bank|account|time|amount|description|ordinal-within-statement), categorizes (`src/lib/categories.ts`: Privat bank category or monobank MCC → `CategoryId`; `classifyKind` → expense/income), inserts with `onConflictDoNothing` on `dedupKey`, then records `upload_transactions` membership for every row (new or already known).
- After any insert or delete, `recompute` re-derives `kind` for **all** transactions and marks internal transfers via `findInternalGroups` (marker text/category, or debit/credit pairs of equal amount within 48h across own accounts, only for `transfers`/`income` categories). In a matched group only the debit side gets `kind = 'internal'` (excluded from expense totals); the credit side is forced to `income`, so a transfer to a family member's card is not an expense for the sender but is income for the receiver.
- `deleteUpload` removes the upload (cascading membership) and deletes only transactions no remaining upload contains, then recomputes.

**Data access**: `getDb()` (`src/db/client.ts`) is a lazy singleton — Neon pool with `DATABASE_URL`, otherwise a file-backed PGlite that auto-applies `drizzle/` migrations (dev only; throws in production). Read-side queries are in `src/db/reports.ts`. All repo/report functions take `db: Db` as the first argument so tests can inject a database.

**Auth**: single user from env. JWT session cookie (`src/lib/auth/session.ts`, jose), scrypt hash (`scrypt:<salt>:<hash>`) in `password.ts`, DB-backed rate limiting by `x-forwarded-for` in `rate-limit.ts`. `src/proxy.ts` gates every non-public path (401 JSON for `/api/*`, redirect to `/login` otherwise). Route handlers and server actions re-check the session themselves (`requireSession()` for actions) — keep that defense in depth. All checks fail closed.

**UI**: authenticated pages live in the `src/app/(app)/` route group (overview `/`, `/category/[id]`, `/transactions`, `/upload`); period selection is via search params resolved in `src/lib/period.ts`. Money is formatted with `formatUAH` in `src/lib/money.ts`. Shared client components are in `src/components/`.

## Tests

Vitest, node environment, `@` alias → `src`. DB tests use `createTestDb()` from `tests/helpers/db.ts` (in-memory PGlite with real migrations applied), so schema changes need a generated migration before tests pass. `tests/helpers/xlsx.ts` builds statement workbooks for parser tests. Fixtures must be anonymized; real statements go in `samples/` (gitignored).

## Privacy constraints

Statement files are never stored; from the monobank header only card masks, IBAN and period are kept. Never log error objects or file contents in the upload path or DB client — they may contain statement data or connection details.
