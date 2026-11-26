import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  arenaSchema, athleteNoteSchema, athleteSchema, athleteUpdateSchema, duplicateCheckSchema, eventSchema, eventUpdateSchema, ufSchema,
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
      heelHandicap: ['Use múltiplos de 0,5.'],
    });
    expect(flat(athleteSchema, { name: 'Zé', cityCode: 1, headHandicap: 11, heelHandicap: 'abc' })).toMatchObject({
      headHandicap: ['O handicap vai de 0 a 10.'],
    });
    expect(flat(athleteSchema, { name: 'x'.repeat(121), cityCode: 1, headHandicap: 1, heelHandicap: 1 }).name)
      .toEqual(['Use no máximo 120 caracteres.']);
  });

  it('aceita só um dos handicaps (o outro sai undefined)', () => {
    const base = { name: 'Zé', cityCode: 1 };
    const head = athleteSchema.parse({ ...base, headHandicap: '2,5', heelHandicap: ' ' });
    expect(head.headHandicap).toBe(2.5);
    expect(head.heelHandicap).toBeUndefined();
    const heel = athleteSchema.parse({ ...base, headHandicap: '', heelHandicap: '3' });
    expect(heel.headHandicap).toBeUndefined();
    expect(heel.heelHandicap).toBe(3);
  });

  it('exige ao menos um handicap, com erro nos dois campos', () => {
    expect(flat(athleteSchema, { name: 'Zé', cityCode: 1, headHandicap: '', heelHandicap: '' })).toEqual({
      headHandicap: ['Informe ao menos um handicap (cabeceiro ou pezeiro).'],
      heelHandicap: ['Informe ao menos um handicap (cabeceiro ou pezeiro).'],
    });
  });

  it('cidade não informada dispensa cityCode e descarta o enviado', () => {
    const base = { name: 'Zé', headHandicap: 1, heelHandicap: 1 };
    const sem = athleteSchema.parse({ ...base, cityUnknown: true, cityCode: '' });
    expect(sem.cityCode).toBeUndefined();
    expect(athleteSchema.parse({ ...base, cityUnknown: true, cityCode: 123 }).cityCode).toBeUndefined();
    expect(flat(athleteSchema, { ...base, cityUnknown: false, cityCode: '' }).cityCode).toEqual(['Escolha uma cidade da lista.']);
    expect(flat(athleteSchema, base).cityCode).toEqual(['Escolha uma cidade da lista.']);
  });

  it('erros de cidade e handicap aparecem junto com erro de outro campo', () => {
    expect(flat(athleteSchema, { name: 'Z', heelHandicap: 'abc' })).toEqual({
      name: ['Informe o nome com pelo menos 2 letras.'],
      cityCode: ['Escolha uma cidade da lista.'],
      heelHandicap: ['Informe o handicap.'],
    });
  });

  it('athleteUpdateSchema aplica as mesmas regras e exige id', () => {
    expect(athleteUpdateSchema.parse({ id: 'a1', name: 'Zé', cityUnknown: true, headHandicap: 2 }))
      .toMatchObject({ id: 'a1', headHandicap: 2 });
    expect(flat(athleteUpdateSchema, { name: 'Z', heelHandicap: 'abc' })).toMatchObject({
      id: expect.any(Array),
      name: expect.any(Array),
      cityCode: ['Escolha uma cidade da lista.'],
      heelHandicap: ['Informe o handicap.'],
    });
    expect(flat(athleteUpdateSchema, { id: 'a1', name: 'Z' })).toMatchObject({
      cityCode: ['Escolha uma cidade da lista.'],
      headHandicap: ['Informe ao menos um handicap (cabeceiro ou pezeiro).'],
      heelHandicap: ['Informe ao menos um handicap (cabeceiro ou pezeiro).'],
    });
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
