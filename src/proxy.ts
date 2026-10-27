import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

const PUBLIC = [/^\/login(\/|$)/, /^\/manifest\.webmanifest$/, /^\/icon/, /^\/apple-icon/, /^\/_next\//, /^\/favicon\.ico$/];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  let ok = false;
  try {
    ok = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    ok = false; // missing SESSION_SECRET etc: fail closed
  }
  if (ok) return NextResponse.next();

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
