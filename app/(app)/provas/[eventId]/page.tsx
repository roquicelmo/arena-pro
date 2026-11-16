import { EventDetailsPage } from '../../../../src/components/EventDetailsPage';
import { loadEvent } from './loadEvent';

export default async function EventOverviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { event } = await loadEvent(eventId);
  return <EventDetailsPage event={event} baseHref={`/provas/${event.id}`} />;
}
