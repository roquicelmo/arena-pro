export interface Grecaptcha {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: Partial<Grecaptcha>;
  }
}

const ONLOAD_CALLBACK = '__arenaProRecaptchaOnload';

let loading: Promise<Grecaptcha> | null = null;

const ready = (): Grecaptcha | null =>
  typeof window.grecaptcha?.execute === 'function' && typeof window.grecaptcha.ready === 'function'
    ? (window.grecaptcha as Grecaptcha)
    : null;

/**
 * Carrega o reCAPTCHA v3 uma vez e só resolve quando `grecaptcha.execute` existe.
 * O evento `load` do script dispara antes de o Google montar a API; por isso
 * usamos o callback `onload=` oficial em vez dele.
 */
export function loadRecaptcha(siteKey: string): Promise<Grecaptcha> {
  const api = ready();
  if (api) return Promise.resolve(api);
  if (loading) return loading;

  loading = new Promise<Grecaptcha>((resolve, reject) => {
    const target = window as unknown as Record<string, unknown>;
    target[ONLOAD_CALLBACK] = () => {
      const loaded = ready();
      if (loaded) resolve(loaded);
    };
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}&onload=${ONLOAD_CALLBACK}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('error', () => {
      script.remove();
      loading = null;
      reject(new Error('Não foi possível carregar o reCAPTCHA.'));
    });
    document.head.appendChild(script);
  });
  return loading;
}

/** Gera um token v3 para a ação informada (vale por 2 minutos; peça um novo a cada envio). */
export async function executeRecaptcha(siteKey: string, action: string): Promise<string> {
  const api = await loadRecaptcha(siteKey);
  await new Promise<void>((resolve) => api.ready(resolve));
  return api.execute(siteKey, { action });
}
