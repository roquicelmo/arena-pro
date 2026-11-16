import type { Metadata } from 'next';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../src/server/session';
import { safeNextPath } from '../../src/lib/safeNextPath';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Arena Pro | Entrar' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; reason?: string | string[] }> }) {
  const params = await searchParams;
  const next = safeNextPath(Array.isArray(params.next) ? params.next[0] : params.next);
  const expired = (Array.isArray(params.reason) ? params.reason[0] : params.reason) === 'expired';
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="flex min-h-screen bg-sand">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-nav p-12 lg:flex" aria-hidden="true">
        {/* Foto já convertida para preto e branco; a camada areia translúcida mantém o texto legível. */}
        <Image src="/images/login-laco-em-dupla.jpg" alt="" fill sizes="(min-width: 1024px) 65vw, 1px" className="object-cover object-center" />
        <div className="absolute inset-0 bg-nav/80" />
        <Image src="/brand/arena-pro-logo.svg" alt="" width={1298} height={614} unoptimized className="relative h-auto w-[300px] xl:w-[360px]" />
        <p className="relative font-display text-7xl font-bold uppercase leading-[0.95] tracking-tight text-ink-strong xl:text-8xl">
          Provas de laço
          <br />
          <span className="text-accent">em dupla</span>
        </p>
      </aside>
      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-[34rem] lg:flex-none lg:px-12">
        <LoginForm next={next} expired={expired} />
      </div>
    </main>
  );
}
