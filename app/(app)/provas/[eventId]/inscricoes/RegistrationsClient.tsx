'use client';

import { useRouter } from 'next/navigation';
import { RegistrationPage } from '../../../../../src/components/RegistrationPage';
import type { EventSummary } from '../../../../../src/types/events';
import type { Competitor } from '../../../../../src/types/roping';

interface RegistrationsClientProps {
  event: EventSummary;
  athletes: Competitor[];
}

/** As mutações continuam no componente antigo; aqui só atualizamos os dados do servidor depois delas. */
export function RegistrationsClient({ event, athletes }: RegistrationsClientProps) {
  const router = useRouter();
  return <RegistrationPage event={event} athletes={athletes} onChanged={() => router.refresh()} />;
}
