'use client';

import { useRouter } from 'next/navigation';
import { AnnouncerPage } from '../../../../../src/components/AnnouncerPage';
import type { EventSummary } from '../../../../../src/types/events';
import type { Run } from '../../../../../src/types/roping';

export function AnnouncerClient({ event, runs }: { event: EventSummary; runs: Run[] }) {
  const router = useRouter();
  return <AnnouncerPage event={event} runs={runs} onOpenRun={() => router.push(`/provas/${event.id}/pista`)} />;
}
