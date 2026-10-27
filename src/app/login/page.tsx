import { Background } from '@/components/Background';
import { LoginForm } from './login-form';

export const metadata = { title: 'Вход' };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 text-white">
      <Background />
      <LoginForm />
    </main>
  );
}
