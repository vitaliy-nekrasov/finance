'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

/** Fades a block in from below; `index` staggers by 80ms. Disabled for reduced motion. */
export function Rise({ index = 0, className, children }: { index?: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
