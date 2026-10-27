import { LoginForm } from './login-form';

export const metadata = { title: 'Вход' };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#07070d] px-4 text-white">
      <div className="login-blob absolute -left-16 -top-20 h-64 w-64 rounded-full bg-[#7c3aed] opacity-55 blur-[60px]" />
      <div
        className="login-blob absolute -right-20 top-1/3 h-56 w-56 rounded-full bg-[#06b6d4] opacity-55 blur-[60px]"
        style={{ animationDelay: '-3s' }}
      />
      <LoginForm />
      <style>{`
        @keyframes login-float{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-14px)}}
        .login-blob{animation:login-float 8s ease-in-out infinite}
        @media (prefers-reduced-motion: reduce){.login-blob{animation:none}}
      `}</style>
    </main>
  );
}
