'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { authClient } from '../../src/auth/session';
import { Button, Input } from '../../src/components/ui';
import { executeRecaptcha, loadRecaptcha } from '../../src/lib/recaptcha';
import { RECAPTCHA_ACTION } from '../../src/lib/recaptchaPolicy';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

export function AccessRequestForm() {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Pré-carrega o reCAPTCHA v3 para o envio não esperar o script do Google.
  useEffect(() => {
    if (SITE_KEY) loadRecaptcha(SITE_KEY).catch(() => undefined);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!SITE_KEY) return;
    setErrorMessage('');
    setSubmitting(true);
    try {
      let recaptchaToken: string;
      try {
        recaptchaToken = await executeRecaptcha(SITE_KEY, RECAPTCHA_ACTION);
      } catch {
        throw new Error('Não foi possível carregar a verificação do reCAPTCHA. Recarregue a página e tente de novo.');
      }
      await authClient.requestAccess({ ...form, recaptchaToken });
      setSent(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível enviar a solicitação.');
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
          // O selo flutuante do Google fica oculto (globals); os termos pedem esta atribuição no lugar.
          <p className="text-xs text-ink-muted">
            Protegido pelo reCAPTCHA do Google. Valem a{' '}
            <a className="underline hover:text-ink-strong" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de Privacidade</a> e os{' '}
            <a className="underline hover:text-ink-strong" href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Termos de Serviço</a>.
          </p>
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
