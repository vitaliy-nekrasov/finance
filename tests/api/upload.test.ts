import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createSessionToken } from '@/lib/auth/session';
import { buildXlsx } from '../helpers/xlsx';
import { createTestDb } from '../helpers/db';
import type { Db } from '@/db/client';

let db: Db;
vi.mock('@/db/client', () => ({ getDb: () => db }));

const { POST } = await import('@/app/api/upload/route');

const TITLE = ['Історія операцій за період 27.09.2026 - 27.10.2026'];
const HEADER = [
  'Дата', 'Категорія', 'Картка', 'Опис операції', 'Сума в валюті картки',
  'Валюта картки', 'Сума в валюті транзакції', 'Валюта транзакції',
  'Залишок на кінець періоду', 'Валюта залишку',
];
const r1 = ['25.10.2026 22:45:22', 'Інтернет-магазини', '4149 **** **** 5143', 'Temu', -440.18, 'UAH', 440.18, 'UAH', 1000, 'UAH'];
const r2 = ['24.10.2026 10:00:00', 'Зарахування', '4149 **** **** 5143', 'Зарплата', 25000, 'UAH', 25000, 'UAH', 25440.18, 'UAH'];

function request(file: File | null, token?: string) {
  const form = new FormData();
  if (file) form.set('file', file);
  return new Request('http://localhost/api/upload', {
    method: 'POST',
    body: form,
    headers: token ? { cookie: `session=${token}` } : {},
  });
}
const privatFile = () => new File([new Uint8Array(buildXlsx([TITLE, HEADER, r1, r2]))], 'privat.xlsx');

describe('POST /api/upload', () => {
  let token: string;
  beforeEach(async () => {
    process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret-1';
    token = await createSessionToken();
    db = await createTestDb();
  });

  test('valid privat file → 200 with counts', async () => {
    const res = await POST(request(privatFile(), token));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ bank: 'privat', total: 2, added: 2, duplicates: 0 });
  });

  test('second upload of same file → added 0', async () => {
    await POST(request(privatFile(), token));
    const res = await POST(request(privatFile(), token));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ added: 0, duplicates: 2 });
  });

  test('garbage file → 400 with Russian message', async () => {
    const res = await POST(request(new File(['not an excel'], 'x.xlsx'), token));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Не удалось распознать/);
  });

  test('missing file field → 400', async () => {
    const res = await POST(request(null, token));
    expect(res.status).toBe(400);
  });

  test('file over 4 MB → 400', async () => {
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.xlsx');
    const res = await POST(request(big, token));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Файл больше 4 МБ');
  });

  test('no session cookie → 401', async () => {
    const res = await POST(request(privatFile()));
    expect(res.status).toBe(401);
  });

  test('invalid session cookie → 401', async () => {
    expect((await POST(request(privatFile(), 'garbage'))).status).toBe(401);
  });
});
