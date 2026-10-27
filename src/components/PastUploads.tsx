'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUploadAction } from '@/app/(app)/upload/actions';
import { Glass } from './Glass';

export type PastUpload = {
  id: number;
  filename: string;
  bank: 'privat' | 'mono';
  periodFrom: string | null;
  periodTo: string | null;
  added: number;
};

const BANK = { privat: 'Приват', mono: 'monobank' } as const;

const ruDate = (iso: string) => iso.split('-').reverse().join('.');

function period(u: PastUpload): string {
  if (u.periodFrom && u.periodTo) return `${ruDate(u.periodFrom)} – ${ruDate(u.periodTo)}`;
  return 'период не указан';
}

export function PastUploads({ uploads }: { uploads: PastUpload[] }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove(id: number) {
    setError(null);
    start(async () => {
      try {
        await deleteUploadAction(id);
        setConfirming(null);
        router.refresh();
      } catch {
        setError('Не удалось удалить загрузку');
      }
    });
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[13px] font-semibold text-white/70">Прошлые загрузки</h2>
      {uploads.length === 0 ? (
        <Glass className="p-3 text-xs text-white/55">Пока ничего не загружено</Glass>
      ) : (
        <Glass className="px-3 py-1">
          <ul>
            {uploads.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 border-b border-white/[.08] py-2.5 last:border-0">
                <div className="min-w-0 text-xs">
                  <div className="truncate">{u.filename}</div>
                  <div className="mt-0.5 text-[10px] text-white/50">
                    {BANK[u.bank] ?? u.bank} · {period(u)} · добавлено {u.added}
                  </div>
                </div>
                {confirming === u.id ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(u.id)}
                    onBlur={() => setConfirming(null)}
                    autoFocus
                    className="shrink-0 rounded-lg bg-rose-500/25 px-2.5 py-1.5 text-[11px] font-medium text-rose-200 disabled:opacity-60"
                  >
                    Точно удалить?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(u.id)}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] text-white/55 transition hover:text-white"
                  >
                    Удалить
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Glass>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
