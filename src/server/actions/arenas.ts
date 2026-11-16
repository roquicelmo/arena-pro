'use server';

import { z } from 'zod';
import type { ActionResult } from '../../lib/actionResult';
import { toArenaOption } from '../../lib/mappers';
import { arenaSchema, ufSchema, type ArenaFormInput } from '../../lib/schemas/cadastros';
import type { ArenaOption } from '../../types/arenas';
import { createArena, deactivateArena, updateArena } from '../services/commands/arenas';
import { listMunicipalities } from '../services/localities';
import { runAction } from './runAction';

const idSchema = z.string().min(1);
const REVALIDATE = ['/provas'];
const DUPLICATE_MESSAGE = 'Já existe uma arena com esse nome nessa cidade.';

export async function createArenaAction(input: ArenaFormInput): Promise<ActionResult<ArenaOption>> {
  const result = await runAction<typeof arenaSchema, ArenaOption | null>(
    { schema: arenaSchema, input, revalidate: (arena) => (arena ? REVALIDATE : []) },
    async (user, data) => {
      const { arena, created } = await createArena(user, data);
      return created ? toArenaOption(arena) : null;
    },
  );
  if (!result.ok) return result;
  if (result.data === null) {
    return { ok: false, message: DUPLICATE_MESSAGE, fieldErrors: { name: [DUPLICATE_MESSAGE] } };
  }
  return { ok: true, data: result.data };
}

export async function updateArenaAction(id: string, input: ArenaFormInput): Promise<ActionResult<ArenaOption>> {
  return runAction(
    { schema: arenaSchema.extend({ id: idSchema }), input: { ...(input as object), id }, revalidate: REVALIDATE },
    async (user, { id: arenaId, ...data }) => toArenaOption(await updateArena(user, arenaId, data)),
  );
}

export async function deactivateArenaAction(id: string): Promise<ActionResult<null>> {
  return runAction({ schema: idSchema, input: id, revalidate: REVALIDATE }, async (user, arenaId) => {
    await deactivateArena(user, arenaId);
    return null;
  });
}

export async function listMunicipalitiesAction(uf: string): Promise<ActionResult<Array<{ code: number; name: string }>>> {
  return runAction({ schema: ufSchema, input: uf, revalidate: [] }, (_user, validUf) => listMunicipalities(validUf));
}
