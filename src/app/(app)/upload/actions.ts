'use server';

import { revalidatePath } from 'next/cache';
import { getDb } from '@/db/client';
import { deleteUpload } from '@/db/repo';
import { requireSession } from '@/lib/auth/require-session';

export async function deleteUploadAction(id: number): Promise<void> {
  if (!(await requireSession())) throw new Error('unauthorized');
  if (!Number.isInteger(id) || id <= 0) throw new Error('bad id');
  await deleteUpload(getDb(), id);
  revalidatePath('/', 'layout');
}
