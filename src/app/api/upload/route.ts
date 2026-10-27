import { NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { ingestStatement } from '@/db/repo';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { StatementError, parseStatement } from '@/lib/statement';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

function readCookie(header: string | null, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

export async function POST(req: Request): Promise<Response> {
  let authed = false;
  try {
    authed = await verifySessionToken(readCookie(req.headers.get('cookie'), SESSION_COOKIE));
  } catch {
    authed = false; // fail closed (e.g. SESSION_SECRET missing)
  }
  if (!authed) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get('file');
  } catch {
    return NextResponse.json({ error: 'Не удалось прочитать файл' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Файл больше 4 МБ' }, { status: 400 });
  }

  try {
    const statement = parseStatement(Buffer.from(await file.arrayBuffer()), file.name);
    return NextResponse.json(await ingestStatement(getDb(), statement, file.name));
  } catch (e) {
    if (e instanceof StatementError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    // Do not log the error body: it may contain statement contents.
    console.error('upload failed');
    return NextResponse.json({ error: 'Не удалось сохранить выписку' }, { status: 500 });
  }
}
