'use server';

import { z } from 'zod';
import type { ActionResult } from '../../lib/actionResult';
import { toEventSummary } from '../../lib/mappers';
import {
  eventSchema, eventUpdateSchema, type EventFormInput, type EventUpdateInput,
} from '../../lib/schemas/cadastros';
import type { EventSummary } from '../../types/events';
import { cancelEvent, createEvent, updateEvent } from '../services/commands/events';
import { runAction, type RevalidateTarget } from './runAction';

const idSchema = z.string().min(1);

/** Meio-dia UTC: o mesmo dia em todo o Brasil. */
const noonUtc = (isoDate: string) => new Date(`${isoDate}T12:00:00.000Z`);

const listTargets = ['/provas', '/agenda', '/'];
const eventTargets = (id: string): RevalidateTarget[] => [...listTargets, { path: `/provas/${id}`, type: 'layout' }];

export async function createEventAction(input: EventFormInput): Promise<ActionResult<{ id: string }>> {
  return runAction({ schema: eventSchema, input, revalidate: listTargets }, async (user, data) => {
    const event = await createEvent(user, {
      name: data.name,
      eventDate: noonUtc(data.eventDate),
      ...(data.arenaId
        ? { arenaId: data.arenaId }
        : { newArena: { name: data.arenaName as string, cityCode: data.cityCode as number } }),
    });
    return { id: event.id };
  });
}

export async function updateEventAction(id: string, input: EventUpdateInput): Promise<ActionResult<EventSummary>> {
  return runAction(
    { schema: eventUpdateSchema.extend({ id: idSchema }), input: { ...(input as object), id }, revalidate: () => eventTargets(id) },
    async (user, { id: eventId, name, eventDate }) =>
      toEventSummary(await updateEvent(user, eventId, { name, eventDate: noonUtc(eventDate) })),
  );
}

export async function cancelEventAction(id: string): Promise<ActionResult<null>> {
  return runAction({ schema: idSchema, input: id, revalidate: () => eventTargets(id) }, async (user, eventId) => {
    await cancelEvent(user, eventId);
    return null;
  });
}
