// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ONLOAD = '__arenaProRecaptchaOnload';
type W = Window & Record<string, unknown>;

const scripts = () => document.head.querySelectorAll<HTMLScriptElement>('script[src*="recaptcha/api.js"]');

describe('loadRecaptcha', () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = '';
    delete (window as W).grecaptcha;
    delete (window as W)[ONLOAD];
  });
  afterEach(() => vi.restoreAllMocks());

  it('não resolve só porque o script carregou: espera o callback onload do Google', async () => {
    const { loadRecaptcha } = await import('./recaptcha');
    const resolved = vi.fn();
    void loadRecaptcha().then(resolved);

    const [script] = scripts();
    expect(script.src).toContain('render=explicit');
    expect(script.src).toContain(`onload=${ONLOAD}`);

    // O script terminou de baixar, mas o Google ainda não montou grecaptcha.render.
    (window as W).grecaptcha = { ready: vi.fn() };
    script.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();

    const render = vi.fn(() => 7);
    (window as W).grecaptcha = { render, reset: vi.fn() };
    (window[ONLOAD as keyof Window] as unknown as () => void)();
    await vi.waitFor(() => expect(resolved).toHaveBeenCalledWith(expect.objectContaining({ render })));
  });

  it('reaproveita o mesmo script e a mesma promessa', async () => {
    const { loadRecaptcha } = await import('./recaptcha');
    const first = loadRecaptcha();
    const second = loadRecaptcha();
    expect(second).toBe(first);
    expect(scripts()).toHaveLength(1);
  });

  it('com grecaptcha.render já pronto, resolve sem injetar script', async () => {
    const render = vi.fn(() => 1);
    (window as W).grecaptcha = { render, reset: vi.fn() };
    const { loadRecaptcha } = await import('./recaptcha');
    await expect(loadRecaptcha()).resolves.toEqual(expect.objectContaining({ render }));
    expect(scripts()).toHaveLength(0);
  });

  it('falha ao baixar o script rejeita e permite tentar de novo', async () => {
    const { loadRecaptcha } = await import('./recaptcha');
    const failed = loadRecaptcha();
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('Não foi possível carregar o reCAPTCHA.');
    expect(scripts()).toHaveLength(0);
    void loadRecaptcha();
    expect(scripts()).toHaveLength(1);
  });
});
