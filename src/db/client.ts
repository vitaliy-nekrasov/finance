import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import ws from 'ws';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | null = null;

/** Lazy singleton: never connects at import time. */
export function getDb(): Db {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  if (typeof WebSocket === 'undefined') neonConfig.webSocketConstructor = ws;
  instance = drizzle(new Pool({ connectionString: url }), { schema }) as unknown as Db;
  return instance;
}
