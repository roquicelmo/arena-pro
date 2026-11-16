// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, SessionExpiredError } from './apiClient';

const assign = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  assign.mockReset();
  vi.stubGlobal('location', { pathname: '/provas/1/pista', search: '?a=1', assign });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('em 401 lança SessionExpiredError e redireciona ao login com next', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401, headers: { 'content-type': 'application/json' } })));
    await expect(apiRequest('/api/x', undefined, 'falha')).rejects.toBeInstanceOf(SessionExpiredError);
    vi.runAllTimers();
    expect(assign).toHaveBeenCalledWith(`/login?next=${encodeURIComponent('/provas/1/pista?a=1')}&reason=expired`);
  });
  it('em outros erros não redireciona', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"message":"ruim"}', { status: 500, headers: { 'content-type': 'application/json' } })));
    await expect(apiRequest('/api/x', undefined, 'falha')).rejects.toThrow('ruim');
    vi.runAllTimers();
    expect(assign).not.toHaveBeenCalled();
  });
});
