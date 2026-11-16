'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnnouncerBoard } from '../../../../../src/components/announcer/AnnouncerBoard';
import { useAutoRefresh } from '../../../../../src/lib/useAutoRefresh';
import type { Run } from '../../../../../src/types/roping';

export function AnnouncerClient({ eventId, runs }: { eventId: string; runs: Run[] }) {
  const router = useRouter();
  useAutoRefresh(useCallback(() => router.refresh(), [router]));
  return <AnnouncerBoard eventId={eventId} runs={runs} />;
}
