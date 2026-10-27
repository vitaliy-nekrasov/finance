'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

export type CategoryBarRow = {
  id: string;
  emoji: string;
  name: string;
  amountText: string;
  ratio: number; // 0..1, amount / max
  href: string;
  tone?: 'inflow';
};

const GRADIENT = {
  default: 'linear-gradient(90deg,#8b5cf6,#06b6d4)',
  inflow: 'linear-gradient(90deg,#34d399,#67e8f9)',
};

export function CategoryBars({ rows }: { rows: CategoryBarRow[] }) {
  const reduce = useReducedMotion();
  return (
    <ul>
      {rows.map((r, i) => (
        <li key={r.id}>
          <Link href={r.href} className="block rounded-lg py-1.5 transition active:bg-white/5">
            <div className="mb-1 flex justify-between gap-3 text-xs">
              <span className="min-w-0 truncate">
                {r.emoji} {r.name}
              </span>
              <span className="shrink-0 tabular-nums">{r.amountText}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-md bg-white/[.08]">
              <motion.div
                className="h-full origin-left rounded-md"
                style={{ width: `${Math.max(r.ratio, 0.02) * 100}%`, backgroundImage: GRADIENT[r.tone ?? 'default'] }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.1, delay: 0.4 + i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
