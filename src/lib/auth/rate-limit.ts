import { and, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '@/db/client';
import { loginAttempts } from '@/db/schema';

export const MAX_FAILED_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000;

export async function isRateLimited(db: Db, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ip, ip), gte(loginAttempts.at, since)));
  return (row?.n ?? 0) >= MAX_FAILED_ATTEMPTS;
}

export async function recordFailedLogin(db: Db, ip: string): Promise<void> {
  await db.insert(loginAttempts).values({ ip });
}
