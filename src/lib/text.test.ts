import { describe, expect, it } from 'vitest';
import { normalizeName } from './text';

describe('normalizeName', () => {
  it('remove acentos, caixa e espaços repetidos', () => {
    expect(normalizeName('  João   da  CONCEIÇÃO ')).toBe('joao da conceicao');
  });
  it('iguala grafias com e sem acento', () => {
    expect(normalizeName('Caiapônia')).toBe(normalizeName('CAIAPONIA'));
  });
});
