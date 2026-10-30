import { Suspense, type ReactNode } from 'react';
import { logoutAction } from '@/app/login/actions';
import { Background } from '@/components/Background';
import { TabBar } from '@/components/TabBar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Background />
      <form action={logoutAction} className="fixed right-3 top-3 z-30" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
        <button
          type="submit"
          aria-label="Выйти"
          title="Выйти"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[.12] bg-white/[.07] text-white/60 backdrop-blur-xl transition hover:text-white active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </form>
      <main
        className="mx-auto w-full max-w-md px-4 pb-32 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 24px)' }}
      >{children}</main>
      <Suspense fallback={null}>
        <TabBar />
      </Suspense>
    </>
  );
}
