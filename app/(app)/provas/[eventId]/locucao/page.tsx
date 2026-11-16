import { notFound } from 'next/navigation';
import { getLatestDrawRuns } from '../../../../../src/server/services/draws';
import { loadEvent } from '../loadEvent';
import { NoDrawState } from '../NoDrawState';
import { AnnouncerClient } from './AnnouncerClient';

export default async function EventAnnouncerPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { user, event } = await loadEvent(eventId);
  const runs = await getLatestDrawRuns(user, event.id);
  if (!runs) notFound();
  if (!runs.length) return <NoDrawState eventId={event.id} />;
  return <AnnouncerClient event={event} runs={runs} />;
}
