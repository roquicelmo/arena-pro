import { notFound } from 'next/navigation';
import { getLatestDraw } from '../../../../../src/server/services/draws';
import { loadEvent } from '../loadEvent';
import { NoDrawState } from '../NoDrawState';
import { TrackClient } from './TrackClient';

export default async function EventTrackPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { user, event } = await loadEvent(eventId);
  const draw = await getLatestDraw(user, event.id);
  if (!draw) notFound();
  const { runs } = draw;
  if (!runs.length) return <NoDrawState eventId={event.id} />;
  // Um novo sorteio traz novas corridas: a chave remonta o estado local dos tempos.
  return <TrackClient key={runs[0].id} runs={runs} locked={event.status === 'FINALIZADA'} />;
}
