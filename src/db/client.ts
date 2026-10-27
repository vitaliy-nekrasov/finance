import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import ws from 'ws';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | null = null;

/**
 * Dev-only fallback: file-backed PGlite at ./.pglite, migrated on first use.
 * Stays synchronous for callers: every query waits for the one-time migration.
 */
function createLocalDb(): Db {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { PGlite } = require('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
  const { drizzle: drizzlePglite } = require('drizzle-orm/pglite') as typeof import('drizzle-orm/pglite');
  const { migrate } = require('drizzle-orm/pglite/migrator') as typeof import('drizzle-orm/pglite/migrator');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const client = new PGlite('./.pglite');
  const ready = migrate(drizzlePglite(client, { schema }), { migrationsFolder: './drizzle' });
  const gated = new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (prop === 'query' || prop === 'exec' || prop === 'transaction') {
        return async (...args: unknown[]) => {
          await ready;
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return drizzlePglite(gated, { schema }) as unknown as Db;
}

/** Lazy singleton: never connects at import time. */
export function getDb(): Db {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is not set');
    // Route handlers and pages may be bundled separately in dev: share one PGlite per process.
    const g = globalThis as { __localDb?: Db };
    instance = g.__localDb ??= createLocalDb();
    return instance;
  }
  if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws;
  instance = drizzle(new Pool({ connectionString: url }), { schema }) as unknown as Db;
  return instance;
}
