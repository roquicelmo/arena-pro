'use server';

import { z } from 'zod';
import type { ActionResult } from '../../lib/actionResult';
import { toCompetitor, type PersistedAthlete } from '../../lib/mappers';
import {
  athleteNoteSchema, athleteSchema, duplicateCheckSchema, type AthleteFormInput,
} from '../../lib/schemas/cadastros';
import type { Competitor } from '../../types/roping';
import { deactivateAthlete, createAthlete, findDuplicateAthletes, saveAthleteNote, updateAthlete } from '../services/commands/athletes';
import { runAction } from './runAction';

const idSchema = z.string().min(1);
const REVALIDATE = ['/atletas', '/', '/sorteio-avulso'];

type DuplicateCandidate = Awaited<ReturnType<typeof findDuplicateAthletes>>[number];

const toPersisted = (athlete: {
  headHandicap: { toString(): string } | number | string;
  heelHandicap: { toString(): string } | number | string;
} & Omit<PersistedAthlete, 'headHandicap' | 'heelHandicap'>): PersistedAthlete => ({
  ...athlete,
  headHandicap: athlete.headHandicap.toString(),
  heelHandicap: athlete.heelHandicap.toString(),
});

export async function createAthleteAction(input: AthleteFormInput): Promise<ActionResult<Competitor>> {
  return runAction({ schema: athleteSchema, input, revalidate: REVALIDATE }, async (user, data) =>
    toCompetitor(toPersisted(await createAthlete(user, data))),
  );
}

export async function updateAthleteAction(id: string, input: AthleteFormInput): Promise<ActionResult<Competitor>> {
  return runAction(
    { schema: athleteSchema.extend({ id: idSchema }), input: { ...(input as object), id }, revalidate: REVALIDATE },
    async (user, { id: athleteId, ...data }) =>
      // Campo opcional em branco vira null para limpar o valor (undefined significa "não alterar" no command).
      toCompetitor(toPersisted(await updateAthlete(user, athleteId, { ...data, nickname: data.nickname ?? null, club: data.club ?? null }))),
  );
}

export async function deactivateAthleteAction(id: string): Promise<ActionResult<null>> {
  return runAction({ schema: idSchema, input: id, revalidate: REVALIDATE }, async (user, athleteId) => {
    await deactivateAthlete(user, athleteId);
    return null;
  });
}

export async function saveAthleteNoteAction(athleteId: string, input: { body: string }): Promise<ActionResult<null>> {
  return runAction(
    { schema: athleteNoteSchema.extend({ athleteId: idSchema }), input: { ...input, athleteId }, revalidate: ['/atletas'] },
    async (user, data) => {
      await saveAthleteNote(user, data.athleteId, data.body);
      return null;
    },
  );
}

export async function checkAthleteDuplicatesAction(
  input: z.input<typeof duplicateCheckSchema>,
): Promise<ActionResult<DuplicateCandidate[]>> {
  return runAction({ schema: duplicateCheckSchema, input, revalidate: [] }, (user, data) =>
    findDuplicateAthletes(user, data),
  );
}
