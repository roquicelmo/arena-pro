import { notFound } from 'next/navigation';
import { RegistrationsView } from '../../../../../src/components/registrations/RegistrationsView';
import { listAthletes } from '../../../../../src/server/services/athletes';
import { listEventRegistrations } from '../../../../../src/server/services/draws';
import { loadEvent } from '../loadEvent';

export default async function EventRegistrationsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const { user, event } = await loadEvent(eventId);
  // Disponíveis (mesma regra de registrableAthleteScope): Admin/Manager veem todos os
  // atletas ativos, inclusive os sem dono; o User, que só acessa as próprias provas,
  // vê os dele e os compartilhados com ele.
  const [registrations, athletes] = await Promise.all([
    listEventRegistrations(user, event.id),
    listAthletes(user),
  ]);
  if (!registrations) notFound();
  return <RegistrationsView eventId={event.id} registrations={registrations} athletes={athletes} />;
}
