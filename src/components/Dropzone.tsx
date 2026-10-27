'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Glass } from './Glass';

type Row = {
  id: number;
  name: string;
  status: 'pending' | 'ok' | 'error';
  text?: string;
  warnings?: string[];
  internalFound?: number;
};

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

let nextId = 1;

export function Dropzone() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [internal, setInternal] = useState<number | null>(null);

  const patch = (id: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function handle(files: File[]) {
    const accepted = files.filter((f) => /\.xlsx?$/i.test(f.name));
    if (!accepted.length || busy) return;
    setBusy(true);
    setInternal(null);
    const batch = accepted.map((f) => ({ id: nextId++, file: f }));
    setRows(batch.map(({ id, file }) => ({ id, name: file.name, status: 'pending' as const })));

    let internalSum = 0;
    // One file per request, strictly sequential: avoids concurrent ingests.
    for (const { id, file } of batch) {
      try {
        const body = new FormData();
        body.set('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          patch(id, { status: 'error', text: data.error ?? 'Не удалось загрузить файл' });
          continue;
        }
        internalSum += data.internalFound ?? 0;
        patch(id, {
          status: 'ok',
          text: `✓ ${data.total} ${plural(data.total, 'операция', 'операции', 'операций')} · ${data.added} новых · ${data.duplicates} уже было`,
          warnings: data.warnings,
        });
      } catch {
        patch(id, { status: 'error', text: 'Нет связи с сервером' });
      }
    }
    setInternal(internalSum);
    setBusy(false);
    router.refresh();
    if (input.current) input.current.value = '';
  }

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(Array.from(e.dataTransfer.files));
        }}
        className={`w-full rounded-[20px] border-[1.5px] border-dashed px-3 py-8 text-center text-[13px] transition disabled:opacity-60 ${
          over ? 'border-[#67e8f9] bg-white/10' : 'border-white/30 bg-transparent'
        }`}
      >
        <svg className="mx-auto mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 17v-6M9.5 13.5 12 11l2.5 2.5" />
        </svg>
        Перетащите или выберите файлы
        <span className="mt-1 block text-[11px] text-white/55">Приват и monobank · Excel (.xls, .xlsx)</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => void handle(Array.from(e.target.files ?? []))}
      />

      {rows.length > 0 && (
        <Glass className="mt-3 px-3 py-1">
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="border-b border-white/[.08] py-2 text-xs last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate">{r.name}</span>
                  {r.status === 'pending' ? (
                    <span
                      role="status"
                      aria-label="Загрузка"
                      className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-[#67e8f9] motion-reduce:animate-none"
                    />
                  ) : (
                    r.status === 'ok' && <span className="shrink-0 text-right text-emerald-300">{r.text}</span>
                  )}
                </div>
                {r.status === 'error' && <p className="mt-1 break-words text-rose-300">{r.text}</p>}
                {r.warnings?.map((w, i) => (
                  <p key={i} className="mt-1 text-[11px] text-amber-300/90">
                    {w}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </Glass>
      )}

      {internal !== null && (
        <Glass className="mt-3 p-3">
          <div className="text-[11px] text-white/55">Найдено переводов между своими</div>
          <div className="mt-0.5 text-[15px] font-semibold">{internal} · не учитываются</div>
        </Glass>
      )}
    </>
  );
}
