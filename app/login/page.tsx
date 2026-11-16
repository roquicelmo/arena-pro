import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../src/server/session';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Sorteios Lagoa | Entrar' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');

  return (
    <main className="flex min-h-screen bg-sand">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-nav p-12 lg:flex" aria-hidden="true">
        <p className="font-display text-xl font-bold uppercase tracking-widest text-ink-strong">Sorteios Lagoa</p>
        <p className="font-display text-7xl font-bold uppercase leading-[0.95] tracking-tight text-ink-strong xl:text-8xl">
          Provas de laço
          <br />
          <span className="text-accent">em dupla</span>
        </p>
      </aside>
      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-[34rem] lg:flex-none lg:px-12">
        <LoginForm />
      </div>
    </main>
  );
}
