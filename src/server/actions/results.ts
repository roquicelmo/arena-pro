'use server';

import { z } from 'zod';
import { publishResults } from '../services/commands/results';
import { runAction } from './runAction';

export async function publishResultsAction(eventId: string) {
  return runAction(
    { schema: z.object({ eventId: z.string().min(1) }), input: { eventId }, revalidate: [{ path: `/provas/${eventId}`, type: 'layout' }, '/provas', '/'] },
    async (user, data) => {
      await publishResults(user, data.eventId);
      return null;
    },
  );
}
