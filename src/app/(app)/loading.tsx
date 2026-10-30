import { Glass } from '@/components/Glass';

const bar = 'skeleton rounded-full';

export default function Loading() {
  return (
    <div role="status" aria-label="Загрузка" className="space-y-4">
      <div className="space-y-3">
        <div className={`${bar} h-3 w-32`} />
        <div className="flex gap-2">
          <div className={`${bar} h-7 w-14`} />
          <div className={`${bar} h-7 w-28`} />
        </div>
      </div>
      <div className="space-y-3 pt-2">
        <div className={`${bar} h-3 w-24`} />
        <div className="skeleton h-12 w-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <Glass key={i} className="space-y-3 p-4">
            <div className={`${bar} h-3 w-14`} />
            <div className={`${bar} h-6 w-24`} />
          </Glass>
        ))}
      </div>
      <Glass className="space-y-5 p-4">
        <div className={`${bar} h-3 w-20`} />
        {[85, 70, 55, 40, 30, 20].map((w, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className={`${bar} h-3.5 w-32`} />
              <div className={`${bar} h-3.5 w-14`} />
            </div>
            <div className={`${bar} h-2 w-full`} style={{ maxWidth: `${w + 15}%` }} />
          </div>
        ))}
      </Glass>
    </div>
  );
}
