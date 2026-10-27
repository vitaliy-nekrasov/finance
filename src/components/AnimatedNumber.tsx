'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { formatUAH } from '@/lib/money';

/** Money value (kopecks) that counts to its new value over 0.8s whenever `value` changes. */
export function AnimatedNumber({
  value,
  sign = false,
  className,
  style,
}: {
  value: number;
  sign?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  // React never re-renders the text itself: the effect owns it after first paint.
  const [initial] = useState(() => formatUAH(value, { sign, decimals: 0 }));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) => formatUAH(Math.round(v), { sign, decimals: 0 });
    if (reduce) {
      shown.current = value;
      el.textContent = fmt(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.8,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = fmt(v);
      },
      onComplete: () => {
        shown.current = value;
        el.textContent = fmt(value);
      },
    });
    return () => controls.stop();
  }, [value, sign, reduce]);

  return (
    <span ref={ref} className={className} style={style} suppressHydrationWarning>
      {initial}
    </span>
  );
}
