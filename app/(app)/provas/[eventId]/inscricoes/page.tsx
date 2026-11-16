import { notFound } from 'next/navigation';
import { RegistrationsView } from '../../../../../src/components/registrations/RegistrationsView';
import { listAthletes } from '../../../../../src/server/services/athletes';
import { listEventRegistrations } from '../../../../../src/server/services/draws';
import { loadEvent } from '../loadEvent';

export default async function EventRegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { user, event } = await loadEvent(eventId);
  // Disponíveis: atletas do dono da prova (dele ou compartilhados com ele), spec 6.9.
  const [registrations, athletes] = await Promise.all([
    listEventRegistrations(user, event.id),
    listAthletes(user, { ownerId: event.ownerId }),
  ]);
  if (!registrations) notFound();
  return <RegistrationsView eventId={event.id} registrations={registrations} athletes={athletes} />;
}
