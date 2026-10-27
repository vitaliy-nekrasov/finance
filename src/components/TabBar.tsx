'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { glassClass } from './Glass';

const svg = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const TABS: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: '/',
    label: 'Обзор',
    icon: (
      <svg {...svg}>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    href: '/upload',
    label: 'Загрузка',
    icon: (
      <svg {...svg}>
        <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
      </svg>
    ),
  },
  {
    href: '/transactions',
    label: 'Операции',
    icon: (
      <svg {...svg}>
        <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
      </svg>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();
  const active = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed inset-x-0 bottom-0 z-20 px-3.5"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <ul className={`mx-auto flex max-w-md justify-around py-2 ${glassClass} !rounded-[22px] !bg-white/[.08]`}>
        {TABS.map((t) => {
          const on = active(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-1 text-[11px] transition-colors ${
                  on ? 'text-[#67e8f9]' : 'text-white/50 hover:text-white/80'
                }`}
              >
                {t.icon}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
