import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy, config } from '@/proxy';
import { createSessionToken } from '@/lib/auth/session';

function req(path: string, method = 'GET', cookie?: string) {
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method,
    headers: cookie ? { cookie: `session=${cookie}` } : {},
  });
}

const passes = (res: Response) => res.headers.get('x-middleware-next') === '1';

describe('proxy', () => {
  let valid: string;
  beforeEach(async () => {
    process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-1';
    valid = await createSessionToken();
  });

  it('returns 401 json for api without cookie', async () => {
    const res = await proxy(req('/api/upload', 'POST'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
  });
  it('redirects pages to /login without cookie', async () => {
    const res = await proxy(req('/'));
    expect(res.headers.get('location')).toMatch(/\/login$/);
  });
  it('redirects on invalid cookie', async () => {
    const res = await proxy(req('/', 'GET', 'garbage'));
    expect(res.headers.get('location')).toMatch(/\/login$/);
  });
  it('passes with valid cookie', async () => {
    expect(passes(await proxy(req('/', 'GET', valid)))).toBe(true);
    expect(passes(await proxy(req('/api/x', 'GET', valid)))).toBe(true);
  });
  it.each([
    '/login',
    '/manifest.webmanifest',
    '/icon',
    '/icon-192.png',
    '/apple-icon.png',
    '/_next/static/a.js',
    '/favicon.ico',
  ])('lets public path %s through', async (p) => {
    expect(passes(await proxy(req(p)))).toBe(true);
  });
  it('exports a matcher', () => {
    expect(config.matcher).toBeTruthy();
  });
});
