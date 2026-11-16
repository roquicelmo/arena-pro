'use client';

import { useRouter } from 'next/navigation';
import { AnnouncerPage } from '../../../../../src/components/AnnouncerPage';
import type { EventSummary } from '../../../../../src/types/events';
import type { Run } from '../../../../../src/types/roping';
import { useFreshServerData } from '../useFreshServerData';

export function AnnouncerClient({ event, runs }: { event: EventSummary; runs: Run[] }) {
  const router = useRouter();
  useFreshServerData();
  return <AnnouncerPage event={event} runs={runs} onOpenRun={() => router.push(`/provas/${event.id}/pista`)} />;
}
