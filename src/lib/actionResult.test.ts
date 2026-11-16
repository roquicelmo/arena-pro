import { describe, expect, it } from 'vitest';
import { formBannerMessage } from './actionResult';

describe('formBannerMessage', () => {
  it('sem mensagem devolve null', () => expect(formBannerMessage(null, {})).toBeNull());
  it('mensagem genérica continua no aviso', () =>
    expect(formBannerMessage('Revise os campos destacados.', { name: ['Informe o nome.'] })).toBe('Revise os campos destacados.'));
  it('mensagem igual à de um campo some do aviso', () =>
    expect(formBannerMessage('Já existe.', { name: ['Já existe.'] })).toBeNull());
  it('sem erros de campo mostra a mensagem', () => expect(formBannerMessage('Falhou.', {})).toBe('Falhou.'));
});
