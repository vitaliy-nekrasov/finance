import Link from 'next/link';

const chip = 'shrink-0 rounded-full border px-3 py-1.5 text-xs transition';
const on = 'border-[#67e8f9]/60 bg-[#67e8f9]/15 text-[#67e8f9]';
const off = 'border-white/[.12] bg-white/[.06] text-white/70';

/** Single-select card chips; hidden when there is nothing to choose between. */
export function CardFilter({
  cards,
  selected,
  hrefFor,
}: {
  cards: string[];
  selected: string | null;
  hrefFor: (card: string | null) => string;
}) {
  if (cards.length < 2) return null;
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" aria-label="Фильтр по картам">
      {[null, ...cards].map((c) => (
        <Link
          key={c ?? 'all'}
          href={hrefFor(c)}
          replace
          scroll={false}
          aria-current={c === selected ? 'true' : undefined}
          className={`${chip} ${c === selected ? on : off}`}
        >
          {c ?? 'Все карты'}
        </Link>
      ))}
    </div>
  );
}
