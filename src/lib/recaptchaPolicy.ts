/** Ação enviada pelo formulário de pedido de acesso e conferida no servidor (reCAPTCHA v3). */
export const RECAPTCHA_ACTION = 'access_request';
/** Nota mínima do reCAPTCHA v3 (0 = robô, 1 = pessoa); 0,5 é o padrão recomendado pelo Google. */
export const RECAPTCHA_MIN_SCORE = 0.5;

export interface SiteverifyResult {
  success?: boolean;
  score?: number;
  action?: string;
}

export type RecaptchaEvaluation = { ok: true } | { ok: false; reason: 'failed' | 'low-score' | 'wrong-action' };

/** Decide se a resposta do siteverify do Google libera o pedido de acesso. */
export function evaluateRecaptcha(result: SiteverifyResult): RecaptchaEvaluation {
  if (result.success !== true || typeof result.score !== 'number') return { ok: false, reason: 'failed' };
  if (result.action !== RECAPTCHA_ACTION) return { ok: false, reason: 'wrong-action' };
  if (result.score < RECAPTCHA_MIN_SCORE) return { ok: false, reason: 'low-score' };
  return { ok: true };
}
