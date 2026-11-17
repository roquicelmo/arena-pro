'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authClient } from '../../src/auth/session';
import { safeNextPath } from '../../src/lib/safeNextPath';
import { Button, Input } from '../../src/components/ui';
import { AccessRequestForm } from './AccessRequestForm';

export function LoginForm({ next = '/', expired = false }: { next?: string; expired?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'request'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);
    try {
      await authClient.login({ email: email.trim(), password });
      router.replace(safeNextPath(next));
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error && error.message ? error.message : 'E-mail ou senha inválidos.');
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-ui border border-line bg-surface p-7 sm:p-9">
      {/* No desktop a logo grande fica na coluna da foto; no celular ela abre o cartão. */}
      <Image src="/brand/arena-pro-logo.svg" alt="Arena Pro" width={1298} height={614} unoptimized className="mx-auto mb-2 h-auto w-[220px] lg:hidden" />
      <p className="hidden font-display text-sm font-bold uppercase tracking-widest text-accent-ink lg:block">Arena Pro</p>

      {mode === 'login' ? (
        <>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-ink-strong">Entrar</h1>
          <p className="mt-2 text-sm text-ink-muted">Use seu e-mail e senha para acessar provas, atletas e resultados.</p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <Input
              label="E-mail"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
            />
            <div className="relative">
              <Input
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                className="pr-11"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-ui text-ink-muted hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>

            {expired && !errorMessage && (
              <div role="status" className="flex gap-2 rounded-ui border border-line bg-sand px-3 py-3 text-sm text-ink-strong">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Sua sessão expirou. Entre novamente para continuar — o que estava sendo lançado no momento (como um tempo) pode não ter sido salvo; confira ao voltar.</span>
              </div>
            )}

            {errorMessage && (
              <div role="alert" className="flex gap-2 rounded-ui border border-danger/40 bg-danger/10 px-3 py-3 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </>
      ) : (
        <AccessRequestForm />
      )}

      <button
        type="button"
        onClick={() => setMode(mode === 'login' ? 'request' : 'login')}
        className="mt-5 w-full text-sm font-semibold text-ink hover:text-ink-strong hover:underline"
      >
        {mode === 'login' ? 'Ainda não tenho acesso' : 'Já tenho uma conta'}
      </button>
    </section>
  );
}
