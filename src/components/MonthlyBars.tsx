'use client';

import { motion, useReducedMotion } from 'motion/react';

export type MonthlyBar = { month: string; label: string; netKop: number; amountText: string; selected: boolean };

export function MonthlyBars({ items }: { items: MonthlyBar[] }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...items.map((i) => Math.abs(i.netKop)));
  return (
    <div className="flex items-end gap-2">
      {items.map((it, i) => {
        const h = Math.abs(it.netKop) === 0 ? 2 : Math.max(4, Math.round((Math.abs(it.netKop) / max) * 72));
        return (
          <div key={it.month} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="mb-1 max-w-full truncate text-[9px] tabular-nums text-white/60">{it.amountText}</div>
            <div className="flex h-[72px] w-full items-end">
              <motion.div
                className="w-full origin-bottom rounded-t-md rounded-b-[3px]"
                style={{
                  height: h,
                  background: it.netKop >= 0 ? '#6ee7b7' : '#fda4af',
                  opacity: it.selected ? 1 : 0.55,
                }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.9, delay: 0.5 + i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
              />
            </div>
            <div className={`mt-1 text-[10px] ${it.selected ? 'text-white' : 'text-white/50'}`}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}
