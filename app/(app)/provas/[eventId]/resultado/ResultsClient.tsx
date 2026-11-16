'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResultsPage } from '../../../../../src/components/ResultsPage';
import { toast } from '../../../../../src/components/ui';
import { apiRequest } from '../../../../../src/lib/apiClient';
import type { EventSummary } from '../../../../../src/types/events';
import type { Run } from '../../../../../src/types/roping';

interface ResultsClientProps {
  event: EventSummary;
  runs: Run[];
  published: boolean;
}

export function ResultsClient({ event, runs, published }: ResultsClientProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onPublish = async () => {
    if (pending) return;
    setPending(true);
    try {
      await apiRequest(`/api/events/${event.id}/results/publish`, { method: 'POST' }, 'Não foi possível publicar os resultados.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível publicar os resultados.');
      setPending(false);
      return;
    }
    toast.success('Resultados publicados.');
    setPending(false);
    router.refresh();
  };

  return <ResultsPage event={event} runs={runs} published={published} onPublish={() => void onPublish()} />;
}
