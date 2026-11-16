import { describe, expect, it } from 'vitest';
import { reassignSchema, shareSchema } from './shares';

const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  result.error?.issues.map((i) => i.message) ?? [];

describe('shareSchema', () => {
  it('listas vazias geram as mensagens', () => {
    const result = shareSchema.safeParse({ type: 'athlete', ids: [], userIds: [] });
    expect(messages(result)).toEqual(['Selecione ao menos um cadastro.', 'Selecione ao menos um usuário.']);
  });
  it('aceita entrada válida e recusa tipo desconhecido', () => {
    expect(shareSchema.safeParse({ type: 'arena', ids: ['a'], userIds: ['u'] }).success).toBe(true);
    expect(shareSchema.safeParse({ type: 'event', ids: ['a'], userIds: ['u'] }).success).toBe(false);
  });
});

describe('reassignSchema', () => {
  it('mensagens de lista e responsável vazios', () => {
    const result = reassignSchema.safeParse({ ids: [], ownerId: '' });
    expect(messages(result)).toEqual(['Selecione ao menos uma prova.', 'Selecione o responsável.']);
  });
});
