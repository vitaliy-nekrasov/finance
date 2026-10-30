'use client';

import Link, { useLinkStatus } from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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

/** Swaps the tab icon for a spinner while the tapped link's navigation is pending. */
function TabIcon({ icon }: { icon: ReactNode }) {
  const { pending } = useLinkStatus();
  if (!pending) return icon;
  return (
    <svg {...svg} className="text-[#67e8f9]" style={{ animation: 'tab-spin 0.7s linear infinite' }}>
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const active = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/category/') : pathname.startsWith(href);

  // Keep the selected period when moving between tabs.
  const period = new URLSearchParams();
  for (const k of ['month', 'from', 'to']) {
    const v = sp.get(k);
    if (v) period.set(k, v);
  }
  const qs = period.toString();
  const withPeriod = (href: string) => (qs ? `${href}?${qs}` : href);

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
                href={withPeriod(t.href)}
                aria-current={on ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-1 text-[11px] transition-colors ${
                  on ? 'text-[#67e8f9]' : 'text-white/50 hover:text-white/80'
                }`}
              >
                <TabIcon icon={t.icon} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
