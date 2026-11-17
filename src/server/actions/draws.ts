'use server';

import { z } from 'zod';
import type { Run } from '../../types/roping';
import { drawConfigSchema, quickDrawSchema, registrationSchema, type RegistrationInput, type QuickDrawInput } from '../../lib/schemas/draws';
import type { DrawConfig } from '../../types/roping';
import { generateDraw, quickDraw } from '../services/commands/draws';
import { cancelRegistration, registerAthlete } from '../services/commands/registrations';
import { runAction, type RevalidateTarget } from './runAction';

const eventTargets = (eventId: string): RevalidateTarget[] => [{ path: `/provas/${eventId}`, type: 'layout' }, '/provas', '/'];
const id = z.string().min(1);

export async function registerAthleteAction(eventId: string, input: RegistrationInput) {
  return runAction(
    { schema: registrationSchema.extend({ eventId: id }), input: { ...input, eventId }, revalidate: eventTargets(eventId) },
    async (user, data) => {
      await registerAthlete(user, data.eventId, { athleteId: data.athleteId, category: data.category });
      return null;
    },
  );
}

export async function cancelRegistrationAction(eventId: string, registrationId: string) {
  return runAction(
    { schema: z.object({ eventId: id, registrationId: id }), input: { eventId, registrationId }, revalidate: eventTargets(eventId) },
    async (user, data) => {
      await cancelRegistration(user, data.eventId, data.registrationId);
      return null;
    },
  );
}

export async function generateDrawAction(eventId: string, config: DrawConfig) {
  return runAction(
    { schema: z.object({ eventId: id, config: drawConfigSchema }), input: { eventId, config }, revalidate: eventTargets(eventId) },
    (user, data) => generateDraw(user, data.eventId, data.config),
  );
}

export async function quickDrawAction(input: QuickDrawInput) {
  return runAction<typeof quickDrawSchema, Run[]>({ schema: quickDrawSchema, input, revalidate: [] }, (user, data) => quickDraw(user, data));
}
