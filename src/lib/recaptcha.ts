export interface Grecaptcha {
  render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'expired-callback': () => void }) => number;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: Partial<Grecaptcha>;
  }
}

const ONLOAD_CALLBACK = '__arenaProRecaptchaOnload';
const SCRIPT_SRC = `https://www.google.com/recaptcha/api.js?onload=${ONLOAD_CALLBACK}&render=explicit`;

let loading: Promise<Grecaptcha> | null = null;

const ready = (): Grecaptcha | null =>
  typeof window.grecaptcha?.render === 'function' ? (window.grecaptcha as Grecaptcha) : null;

/**
 * Carrega o reCAPTCHA uma vez e só resolve quando `grecaptcha.render` existe.
 * O evento `load` do script dispara antes de o Google montar a API; por isso
 * usamos o callback `onload=` oficial em vez dele.
 */
export function loadRecaptcha(): Promise<Grecaptcha> {
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
    script.src = SCRIPT_SRC;
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
