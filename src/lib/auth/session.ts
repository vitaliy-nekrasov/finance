import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SEC = 90 * 24 * 60 * 60;

// Edge/proxy-safe: only `jose`, secret read at call time.
function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('family')
    .setIssuedAt()
    .setExpirationTime('90d')
    .sign(secretKey());
}

export async function verifySessionToken(t: string | undefined): Promise<boolean> {
  if (!t) return false;
  try {
    await jwtVerify(t, secretKey(), { algorithms: ['HS256'], subject: 'family' });
    return true;
  } catch {
    return false;
  }
}
