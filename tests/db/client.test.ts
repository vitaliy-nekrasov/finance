import { afterEach, expect, test, vi } from 'vitest';

const pools: { opts: Record<string, unknown>; on: ReturnType<typeof vi.fn> }[] = [];

vi.mock('@neondatabase/serverless', () => ({
  neonConfig: {},
  Pool: class {
    on = vi.fn();
    constructor(opts: Record<string, unknown>) {
      pools.push({ opts, on: this.on });
    }
  },
}));
vi.mock('drizzle-orm/neon-serverless', () => ({ drizzle: () => ({}) }));

afterEach(() => {
  vi.unstubAllEnvs();
});

test('Neon pool swallows idle-client errors and keeps a small idle-limited pool', async () => {
  vi.stubEnv('DATABASE_URL', 'postgres://u:p@example.invalid/db');
  const { getDb } = await import('@/db/client');
  getDb();
  expect(pools).toHaveLength(1);
  const [{ opts, on }] = pools;
  expect(opts).toMatchObject({ idleTimeoutMillis: 10_000, max: 5 });
  expect(on).toHaveBeenCalledWith('error', expect.any(Function));
  const handler = on.mock.calls.find(([ev]) => ev === 'error')![1] as (e: Error) => void;
  expect(() => handler(new Error('terminated'))).not.toThrow();
});
