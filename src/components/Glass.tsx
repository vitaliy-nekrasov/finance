import type { ReactNode } from 'react';

export const glassClass = 'rounded-[20px] border border-white/[.12] bg-white/[.07] backdrop-blur-xl';

export function Glass({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`${glassClass} ${className}`}>{children}</div>;
}
