'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { authClient } from '../../src/auth/session';
import { Button, Input } from '../../src/components/ui';

declare global {
  interface Window {
    grecaptcha?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export function AccessRequestForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);

  useEffect(() => {
    if (!SITE_KEY || widgetId.current !== null) return;
    const renderCaptcha = () => {
      if (recaptchaRef.current && window.grecaptcha && widgetId.current === null) {
        widgetId.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => setRecaptchaToken(token),
          'expired-callback': () => setRecaptchaToken(''),
        });
      }
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src*="recaptcha/api.js"]');
    if (existing) {
      if (window.grecaptcha) renderCaptcha();
      else existing.addEventListener('load', renderCaptcha, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = renderCaptcha;
    document.head.appendChild(script);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    if (!recaptchaToken) {
      setErrorMessage('Complete a validação do reCAPTCHA para continuar.');
      return;
    }
    setSubmitting(true);
    try {
      await authClient.requestAccess({ ...form, recaptchaToken });
      setSent(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.');
      setRecaptchaToken('');
      if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="mt-6 rounded-ui border border-line bg-sand p-5 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent" aria-hidden="true" />
        <h2 className="mt-3 font-display text-xl font-bold uppercase text-ink-strong">Solicitação enviada</h2>
        <p className="mt-2 text-sm text-ink-muted">Seus dados foram recebidos. Aguarde o contato de um administrador.</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-ink-strong">Solicitar acesso</h1>
      <p className="mt-2 text-sm text-ink-muted">Envie seus dados. Um administrador analisará e liberará seu acesso.</p>
      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <Input label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Seu nome completo" />
        <Input label="Telefone" type="tel" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(00) 00000-0000" />
        <Input label="E-mail" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="seu@email.com" />
        {SITE_KEY ? (
          <div ref={recaptchaRef} className="min-h-[78px]" />
        ) : (
          <p className="text-xs text-ink-muted">A verificação reCAPTCHA não está disponível neste ambiente, por isso o envio está desativado.</p>
        )}
        {errorMessage && (
          <div role="alert" className="flex gap-2 rounded-ui border border-danger/40 bg-danger/10 px-3 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!SITE_KEY}>
          {submitting ? 'Enviando...' : 'Enviar solicitação'}
        </Button>
      </form>
    </>
  );
}
