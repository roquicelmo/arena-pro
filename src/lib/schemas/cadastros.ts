import { z } from 'zod';

/** Texto vazio ou só com espaços vira `undefined` antes da validação. */
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, `Use no máximo ${max} caracteres.`).optional());

const requiredText = (min: number, max: number, required: string, tooShort = required) =>
  z.preprocess(
    blankToUndefined,
    z.string({ error: required }).trim().min(min, tooShort).max(max, `Use no máximo ${max} caracteres.`),
  );

const CITY_MESSAGE = 'Escolha uma cidade da lista.';
const toNumber = (value: unknown) => {
  const v = blankToUndefined(value);
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return Number(v.trim());
  return v;
};
const cityCodeField = z.preprocess(toNumber, z.number({ error: CITY_MESSAGE }).int(CITY_MESSAGE).positive(CITY_MESSAGE));
const optionalCityCodeField = z.preprocess(toNumber, z.number({ error: CITY_MESSAGE }).int(CITY_MESSAGE).positive(CITY_MESSAGE).optional());

const handicapField = z.preprocess(
  (value) => {
    const v = blankToUndefined(value);
    if (typeof v === 'string') {
      const text = v.trim().replace(',', '.');
      return /^\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN;
    }
    return v;
  },
  z
    .number({ error: 'Informe o handicap.' })
    .min(0, 'O handicap vai de 0 a 10.')
    .max(10, 'O handicap vai de 0 a 10.')
    .refine((n) => Number.isInteger(n * 2), 'Use múltiplos de 0,5.'),
);

const ARENA_NAME_MESSAGE = 'Informe o nome da arena.';

export const athleteSchema = z.object({
  name: requiredText(2, 120, 'Informe o nome com pelo menos 2 letras.'),
  nickname: optionalText(80),
  club: optionalText(80),
  cityCode: cityCodeField,
  headHandicap: handicapField,
  heelHandicap: handicapField,
});

export const arenaSchema = z.object({
  name: requiredText(2, 120, ARENA_NAME_MESSAGE),
  cityCode: cityCodeField,
});

const eventName = requiredText(3, 160, 'Informe o nome da prova (mínimo 3 letras).');
const eventDate = z.preprocess(
  blankToUndefined,
  z
    .string({ error: 'Informe uma data válida.' })
    .trim()
    .refine((value) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return false;
      const [, y, m, d] = match.map(Number);
      const date = new Date(Date.UTC(y, m - 1, d));
      return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
    }, 'Informe uma data válida.'),
);

export const eventSchema = z
  .object({
    name: eventName,
    eventDate,
    arenaId: z.preprocess(blankToUndefined, z.string().optional()),
    arenaName: optionalArenaName(),
    cityCode: optionalCityCodeField,
  })
  .superRefine((value, ctx) => {
    if (value.arenaId) return;
    if (!value.arenaName) ctx.addIssue({ code: 'custom', path: ['arenaName'], message: ARENA_NAME_MESSAGE });
    if (value.cityCode === undefined) ctx.addIssue({ code: 'custom', path: ['cityCode'], message: CITY_MESSAGE });
  });

function optionalArenaName() {
  return z.preprocess(
    blankToUndefined,
    z.string().trim().min(2, ARENA_NAME_MESSAGE).max(120, 'Use no máximo 120 caracteres.').optional(),
  );
}

export const eventUpdateSchema = z.object({ name: eventName, eventDate });

export const athleteNoteSchema = z.object({
  body: z.string({ error: 'Use no máximo 2000 caracteres.' }).max(2000, 'Use no máximo 2000 caracteres.'),
});

export const duplicateCheckSchema = z.object({
  name: athleteSchema.shape.name,
  cityCode: cityCodeField,
  club: athleteSchema.shape.club,
});

export const ufSchema = z.string().regex(/^[A-Z]{2}$/);

export type AthleteFormInput = z.input<typeof athleteSchema>;
export type ArenaFormInput = z.input<typeof arenaSchema>;
export type EventFormInput = z.input<typeof eventSchema>;
export type EventUpdateInput = z.input<typeof eventUpdateSchema>;
export type AthleteNoteInput = z.input<typeof athleteNoteSchema>;
export type DuplicateCheckInput = z.input<typeof duplicateCheckSchema>;
