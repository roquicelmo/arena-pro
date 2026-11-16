import { describe, expect, it } from 'vitest';
import { RECAPTCHA_ACTION, RECAPTCHA_MIN_SCORE, evaluateRecaptcha } from './recaptchaPolicy';

describe('evaluateRecaptcha (v3)', () => {
  it('aceita sucesso com a ação certa e nota suficiente', () => {
    expect(evaluateRecaptcha({ success: true, action: RECAPTCHA_ACTION, score: 0.9 })).toEqual({ ok: true });
    expect(evaluateRecaptcha({ success: true, action: RECAPTCHA_ACTION, score: RECAPTCHA_MIN_SCORE })).toEqual({ ok: true });
  });

  it('recusa nota baixa', () => {
    expect(evaluateRecaptcha({ success: true, action: RECAPTCHA_ACTION, score: 0.3 })).toEqual({ ok: false, reason: 'low-score' });
  });

  it('recusa token de outra ação', () => {
    expect(evaluateRecaptcha({ success: true, action: 'login', score: 0.9 })).toEqual({ ok: false, reason: 'wrong-action' });
  });

  it('recusa falha do Google e resposta sem nota (token v2)', () => {
    expect(evaluateRecaptcha({ success: false })).toEqual({ ok: false, reason: 'failed' });
    expect(evaluateRecaptcha({ success: true })).toEqual({ ok: false, reason: 'failed' });
  });

  it('usa a ação access_request e nota mínima 0,5', () => {
    expect(RECAPTCHA_ACTION).toBe('access_request');
    expect(RECAPTCHA_MIN_SCORE).toBe(0.5);
  });
});
