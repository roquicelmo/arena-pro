import { listAthletes } from '../../../../../src/server/services/athletes';
import { loadEvent } from '../loadEvent';
import { RegistrationsClient } from './RegistrationsClient';

export default async function EventRegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { user, event } = await loadEvent(eventId);
  const athletes = await listAthletes(user);
  return <RegistrationsClient event={event} athletes={athletes} />;
}
