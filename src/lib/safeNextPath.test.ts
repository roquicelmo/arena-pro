import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safeNextPath';

describe('safeNextPath', () => {
  it('aceita caminhos relativos', () => {
    expect(safeNextPath('/provas/abc/pista')).toBe('/provas/abc/pista');
    expect(safeNextPath('/provas?x=1#a')).toBe('/provas?x=1#a');
  });
  it.each([
    ['//evil.com'],
    ['/\\evil.com'],
    ['\\\\evil.com'],
    ['http://evil.com'],
    ['https://evil.com/x'],
    ['javascript:alert(1)'],
    ['provas'],
    [''],
    ['/a\nb'],
  ])('rejeita %j', (input) => {
    expect(safeNextPath(input)).toBe('/');
  });
  it('trata ausência como raiz', () => {
    expect(safeNextPath(undefined)).toBe('/');
    expect(safeNextPath(null)).toBe('/');
  });
  it('não aceita /login como destino (evita laço)', () => {
    expect(safeNextPath('/login?next=/')).toBe('/');
  });
});
