import { describe, it, expect, beforeEach } from 'vitest';
import { SignJWT } from 'jose';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';
import { isRateLimited, recordFailedLogin } from '@/lib/auth/rate-limit';
import { loginAttempts } from '@/db/schema';
import { createTestDb } from '../helpers/db';

const key = (s: string) => new TextEncoder().encode(s);
const SECRET = 'test-secret-test-secret-test-secret-1';

describe('password', () => {
  it('verifies correct and rejects wrong password', () => {
    expect(verifyPassword('secret', hashPassword('secret'))).toBe(true);
    expect(verifyPassword('wrong', hashPassword('secret'))).toBe(false);
  });
  it('salts the hash', () => {
    expect(hashPassword('a')).not.toBe(hashPassword('a'));
  });
  it('rejects malformed stored value', () => {
    expect(verifyPassword('a', '')).toBe(false);
    expect(verifyPassword('a', 'scrypt:zz')).toBe(false);
  });
});

describe('session token', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = SECRET;
  });
  it('accepts a fresh token', async () => {
    expect(await verifySessionToken(await createSessionToken())).toBe(true);
  });
  it('rejects garbage and undefined', async () => {
    expect(await verifySessionToken('garbage')).toBe(false);
    expect(await verifySessionToken(undefined)).toBe(false);
  });
  it('rejects token signed with another secret', async () => {
    const t = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('family')
      .setExpirationTime('90d')
      .sign(key('other-secret-other-secret-other-secret'));
    expect(await verifySessionToken(t)).toBe(false);
  });
  it('rejects expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const t = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('family')
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(key(SECRET));
    expect(await verifySessionToken(t)).toBe(false);
  });
  it('rejects token with wrong subject', async () => {
    const t = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('other')
      .setExpirationTime('90d')
      .sign(key(SECRET));
    expect(await verifySessionToken(t)).toBe(false);
  });
});

describe('rate limit', () => {
  it('limits after 5 failed attempts per ip', async () => {
    const db = await createTestDb();
    for (let i = 0; i < 4; i++) await recordFailedLogin(db, '1.1.1.1');
    expect(await isRateLimited(db, '1.1.1.1')).toBe(false);
    await recordFailedLogin(db, '1.1.1.1');
    expect(await isRateLimited(db, '1.1.1.1')).toBe(true);
    expect(await isRateLimited(db, '2.2.2.2')).toBe(false);
  });
  it('ignores attempts older than 15 minutes', async () => {
    const db = await createTestDb();
    const old = new Date(Date.now() - 16 * 60 * 1000);
    await db.insert(loginAttempts).values(Array.from({ length: 5 }, () => ({ ip: '3.3.3.3', at: old })));
    expect(await isRateLimited(db, '3.3.3.3')).toBe(false);
  });
});
