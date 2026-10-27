'use client';

import { useActionState, useEffect } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { loginAction } from './actions';

const inputCls =
  'mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white outline-none transition focus:border-[#67e8f9]/60 focus:bg-white/10';

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  const controls = useAnimationControls();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (state.error && !reduce) {
      controls.start({ x: [0, -10, 10, -8, 8, -4, 0], transition: { duration: 0.45 } });
    }
  }, [state, controls, reduce]);

  return (
    <motion.form
      action={action}
      animate={controls}
      className="relative w-full max-w-sm rounded-[20px] border border-white/[.12] bg-white/[.07] p-6 backdrop-blur-xl"
    >
      <h1 className="text-2xl font-bold tracking-tight">Вход</h1>
      <p className="mt-1 text-sm text-white/60">Семейные финансы</p>

      <label className="mt-5 block text-xs text-white/60">
        Логин
        <input name="username" type="text" autoComplete="username" required className={inputCls} />
      </label>
      <label className="mt-3 block text-xs text-white/60">
        Пароль
        <input name="password" type="password" autoComplete="current-password" required className={inputCls} />
      </label>

      <p role="alert" className="mt-3 min-h-5 text-sm text-rose-300">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] px-4 py-3 text-base font-semibold text-white transition active:scale-[.98] disabled:opacity-60"
      >
        Войти
      </button>
    </motion.form>
  );
}
