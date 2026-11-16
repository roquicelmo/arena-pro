import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  arenaSchema, athleteNoteSchema, athleteSchema, duplicateCheckSchema, eventSchema, eventUpdateSchema, ufSchema,
} from './cadastros';

const flat = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input);
  if (result.success) throw new Error('esperava falha');
  return z.flattenError(result.error as z.ZodError).fieldErrors;
};

describe('athleteSchema', () => {
  it('aceita handicap com vírgula, ponto ou número e cityCode numérico em texto', () => {
    expect(athleteSchema.safeParse({ name: ' Zé ', headHandicap: '2,5', heelHandicap: 3, cityCode: '5205406' }).data)
      .toMatchObject({ name: 'Zé', headHandicap: 2.5, heelHandicap: 3, cityCode: 5205406 });
    expect(athleteSchema.parse({ name: 'Zé', headHandicap: '1.5', heelHandicap: '0', cityCode: 1 }).headHandicap).toBe(1.5);
  });

  it('devolve mensagens em pt-BR', () => {
    expect(flat(athleteSchema, { name: 'Z', headHandicap: '', heelHandicap: 2.3 })).toEqual({
      name: ['Informe o nome com pelo menos 2 letras.'],
      cityCode: ['Escolha uma cidade da lista.'],
      headHandicap: ['Informe o handicap.'],
      heelHandicap: ['Use múltiplos de 0,5.'],
    });
    expect(flat(athleteSchema, { name: 'Zé', cityCode: 1, headHandicap: 11, heelHandicap: 'abc' })).toMatchObject({
      headHandicap: ['O handicap vai de 0 a 10.'],
    });
    expect(flat(athleteSchema, { name: 'x'.repeat(121), cityCode: 1, headHandicap: 1, heelHandicap: 1 }).name)
      .toEqual(['Use no máximo 120 caracteres.']);
  });

  it('textos opcionais em branco viram undefined e chaves desconhecidas somem', () => {
    const data = athleteSchema.parse({
      name: 'Zé', headHandicap: 1, heelHandicap: 1, cityCode: 1, nickname: '   ', club: '', ownerId: 'x',
    });
    expect(data.nickname).toBeUndefined();
    expect(data.club).toBeUndefined();
    expect(data).not.toHaveProperty('ownerId');
  });

  it('limita apelido e clube a 80', () => {
    expect(flat(athleteSchema, { name: 'Zé', headHandicap: 1, heelHandicap: 1, cityCode: 1, club: 'c'.repeat(81) }).club)
      .toEqual(['Use no máximo 80 caracteres.']);
  });
});

describe('arenaSchema', () => {
  it('exige nome e cidade', () => {
    expect(flat(arenaSchema, { name: ' ' })).toEqual({
      name: ['Informe o nome da arena.'],
      cityCode: ['Escolha uma cidade da lista.'],
    });
    expect(arenaSchema.parse({ name: 'Lagoa', cityCode: '10' })).toEqual({ name: 'Lagoa', cityCode: 10 });
  });
});

describe('eventSchema', () => {
  it('valida data real e exige arena nova sem arenaId', () => {
    expect(flat(eventSchema, { name: 'Copa', eventDate: '2026-02-30' })).toEqual({
      eventDate: ['Informe uma data válida.'],
      arenaName: ['Informe o nome da arena.'],
      cityCode: ['Escolha uma cidade da lista.'],
    });
  });

  it('com arenaId dispensa arenaName e cityCode', () => {
    expect(eventSchema.safeParse({ name: 'Copa', eventDate: '2026-12-05', arenaId: 'a1' }).success).toBe(true);
  });

  it('com arena nova aceita os dados', () => {
    expect(eventSchema.parse({ name: 'Copa', eventDate: '2026-12-05', arenaName: 'Lagoa', cityCode: '7' }))
      .toEqual({ name: 'Copa', eventDate: '2026-12-05', arenaName: 'Lagoa', cityCode: 7 });
  });

  it('nome curto', () => {
    expect(flat(eventSchema, { name: 'Co', eventDate: '2026-12-05', arenaId: 'a' }).name)
      .toEqual(['Informe o nome da prova (mínimo 3 letras).']);
  });
});

describe('demais schemas', () => {
  it('eventUpdateSchema exige nome e data', () => {
    expect(Object.keys(flat(eventUpdateSchema, {})).sort()).toEqual(['eventDate', 'name']);
  });

  it('athleteNoteSchema permite vazio e limita a 2000', () => {
    expect(athleteNoteSchema.safeParse({ body: '' }).success).toBe(true);
    expect(flat(athleteNoteSchema, { body: 'x'.repeat(2001) }).body).toEqual(['Use no máximo 2000 caracteres.']);
  });

  it('duplicateCheckSchema usa as regras do atleta', () => {
    expect(flat(duplicateCheckSchema, { name: 'Z' })).toMatchObject({ name: ['Informe o nome com pelo menos 2 letras.'] });
  });

  it('ufSchema', () => {
    expect(ufSchema.safeParse('GO').success).toBe(true);
    expect(ufSchema.safeParse('go').success).toBe(false);
  });
});
