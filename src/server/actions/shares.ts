'use server';

import type { ActionResult } from '../../lib/actionResult';
import { reassignSchema, shareSchema, type ReassignInput, type ShareInput } from '../../lib/schemas/shares';
import { MANAGER_ROLES } from '../permissions';
import { reassignEvents, shareRecords, unshareRecords } from '../services/commands/shares';
import { runAction } from './runAction';

const REVALIDATE = ['/cadastros', '/atletas', '/provas', '/', '/agenda', '/sorteio-avulso'];

export async function shareRecordsAction(input: ShareInput): Promise<ActionResult<{ added: number }>> {
  return runAction({ schema: shareSchema, input, revalidate: REVALIDATE, roles: MANAGER_ROLES }, (user, data) =>
    shareRecords(user, data),
  );
}

export async function unshareRecordsAction(input: ShareInput): Promise<ActionResult<{ removed: number }>> {
  return runAction({ schema: shareSchema, input, revalidate: REVALIDATE, roles: MANAGER_ROLES }, (user, data) =>
    unshareRecords(user, data),
  );
}

export async function reassignEventsAction(input: ReassignInput): Promise<ActionResult<{ updated: number }>> {
  return runAction({ schema: reassignSchema, input, revalidate: REVALIDATE, roles: MANAGER_ROLES }, (user, data) =>
    reassignEvents(user, data),
  );
}
