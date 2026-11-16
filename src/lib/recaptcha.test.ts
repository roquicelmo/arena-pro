// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ONLOAD = '__arenaProRecaptchaOnload';
const KEY = 'chave-de-site';
type W = Window & Record<string, unknown>;

const scripts = () => document.head.querySelectorAll<HTMLScriptElement>('script[src*="recaptcha/api.js"]');
const fireOnload = () => (window[ONLOAD as keyof Window] as unknown as () => void)();
const readyApi = (execute = vi.fn(async () => 'token-v3')) => ({ ready: (cb: () => void) => cb(), execute });

describe('reCAPTCHA v3', () => {
  beforeEach(() => {
    vi.resetModules();
    document.head.innerHTML = '';
    delete (window as W).grecaptcha;
    delete (window as W)[ONLOAD];
  });
  afterEach(() => vi.restoreAllMocks());

  it('carrega a API v3 com a chave e só resolve no callback onload do Google', async () => {
    const { loadRecaptcha } = await import('./recaptcha');
    const resolved = vi.fn();
    void loadRecaptcha(KEY).then(resolved);

    const [script] = scripts();
    expect(script.src).toContain(`render=${KEY}`);
    expect(script.src).toContain(`onload=${ONLOAD}`);

    // O script baixou, mas o Google ainda não montou execute.
    (window as W).grecaptcha = { ready: vi.fn() };
    script.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();

    (window as W).grecaptcha = readyApi();
    fireOnload();
    await vi.waitFor(() => expect(resolved).toHaveBeenCalled());
  });

  it('reaproveita o mesmo script e a mesma promessa', async () => {
    const { loadRecaptcha } = await import('./recaptcha');
    expect(loadRecaptcha(KEY)).toBe(loadRecaptcha(KEY));
    expect(scripts()).toHaveLength(1);
  });

  it('falha ao baixar o script rejeita e permite tentar de novo', async () => {
    const { loadRecaptcha } = await import('./recaptcha');
    const failed = loadRecaptcha(KEY);
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('Não foi possível carregar o reCAPTCHA.');
    expect(scripts()).toHaveLength(0);
    void loadRecaptcha(KEY);
    expect(scripts()).toHaveLength(1);
  });

  it('executeRecaptcha pede um token para a ação informada', async () => {
    const execute = vi.fn(async () => 'token-v3');
    (window as W).grecaptcha = readyApi(execute);
    const { executeRecaptcha } = await import('./recaptcha');
    await expect(executeRecaptcha(KEY, 'access_request')).resolves.toBe('token-v3');
    expect(execute).toHaveBeenCalledWith(KEY, { action: 'access_request' });
    expect(scripts()).toHaveLength(0);
  });
});
