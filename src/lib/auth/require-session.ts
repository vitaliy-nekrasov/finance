import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySessionToken } from './session';

/** For server actions: true only with a valid session cookie. Fails closed. */
export async function requireSession(): Promise<boolean> {
  try {
    return await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  } catch {
    return false;
  }
}
