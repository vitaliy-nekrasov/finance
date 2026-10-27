'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const paramsRef = useRef(params);
  useEffect(() => {
    paramsRef.current = params;
  });

  useEffect(() => {
    const next = value.trim();
    if (next === (paramsRef.current.get('q') ?? '')) return;
    const t = setTimeout(() => {
      const sp = new URLSearchParams(paramsRef.current.toString());
      if (next) sp.set('q', next);
      else sp.delete('q');
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [value, pathname, router]);

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Поиск по описанию"
      aria-label="Поиск по описанию"
      className="w-full rounded-xl border border-white/[.12] bg-white/[.06] px-3.5 py-2.5 text-[13px] text-white placeholder:text-white/40"
    />
  );
}
