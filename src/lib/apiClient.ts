import { safeNextPath } from './safeNextPath';

/** Sessão expirada (401): quem chama deve avisar que a ação não foi concluída. */
export class SessionExpiredError extends Error {
  constructor(message = 'Sessão expirada. Entre novamente.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

/** Tempo para o aviso do chamador aparecer antes de a página trocar para o login. */
const LOGIN_REDIRECT_DELAY_MS = 2500;
let redirecting = false;

/** Único ponto que leva ao login ao perder a sessão, voltando depois para a página atual. */
export function redirectToLogin() {
  if (typeof window === 'undefined' || redirecting) return;
  if (window.location.pathname === '/login') return;
  redirecting = true;
  const next = safeNextPath(window.location.pathname + window.location.search);
  setTimeout(() => {
    redirecting = false;
    window.location.assign(`/login?next=${encodeURIComponent(next)}&reason=expired`);
  }, LOGIN_REDIRECT_DELAY_MS);
}

/** Chama a API e devolve o JSON; em falha lança Error com a mensagem do servidor (ou o fallback). */
export async function apiRequest<T = unknown>(url: string, init: RequestInit | undefined, fallbackMessage: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error(fallbackMessage);
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (!response.ok) {
    if (response.status === 401) {
      redirectToLogin();
      throw new SessionExpiredError();
    }
    const body = isJson ? await response.json().catch(() => null) as { message?: string } | null : null;
    throw new Error(body?.message ?? fallbackMessage);
  }
  return isJson ? await response.json() as T : null;
}
