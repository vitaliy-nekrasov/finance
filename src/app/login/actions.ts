'use server';

import { timingSafeEqual } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/db/client';
import { verifyPassword } from '@/lib/auth/password';
import { isRateLimited, recordFailedLogin } from '@/lib/auth/rate-limit';
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, createSessionToken } from '@/lib/auth/session';

type State = { error?: string };

const BAD_CREDENTIALS = 'Неверный логин или пароль';
const TOO_MANY = 'Слишком много попыток. Попробуйте через 15 минут';

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function loginAction(_prev: State, form: FormData): Promise<State> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const db = getDb();

  if (await isRateLimited(db, ip)) return { error: TOO_MANY };

  const username = String(form.get('username') ?? '');
  const password = String(form.get('password') ?? '');
  const expectedUser = process.env.AUTH_USERNAME ?? '';
  const hash = process.env.AUTH_PASSWORD_HASH ?? '';

  // Evaluate both checks so timing doesn't reveal which one failed.
  const userOk = expectedUser !== '' && safeEqual(username, expectedUser);
  const passOk = hash !== '' && verifyPassword(password, hash);

  if (!userOk || !passOk) {
    await recordFailedLogin(db, ip);
    return { error: BAD_CREDENTIALS };
  }

  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
