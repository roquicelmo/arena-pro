'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnnouncerBoard } from '../../../../../src/components/announcer/AnnouncerBoard';
import { useAutoRefresh } from '../../../../../src/lib/useAutoRefresh';
import type { Run } from '../../../../../src/types/roping';
import { useFreshServerData } from '../useFreshServerData';

export function AnnouncerClient({ eventId, runs }: { eventId: string; runs: Run[] }) {
  const router = useRouter();
  // Ao chegar, busca dados frescos (o cache do router pode estar velho); depois, a cada 3 s.
  useFreshServerData();
  useAutoRefresh(useCallback(() => router.refresh(), [router]));
  return <AnnouncerBoard eventId={eventId} runs={runs} />;
}
