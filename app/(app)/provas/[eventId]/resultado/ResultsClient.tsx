'use client';

import { ResultsBoard } from '../../../../../src/components/results/ResultsBoard';
import { useConfirm } from '../../../../../src/components/ui';
import { useAction } from '../../../../../src/lib/useAction';
import { publishResultsAction } from '../../../../../src/server/actions/results';
import type { EventSummary } from '../../../../../src/types/events';
import type { Run } from '../../../../../src/types/roping';
import { useFreshServerData } from '../useFreshServerData';

export function ResultsClient({ event, runs, published }: { event: EventSummary; runs: Run[]; published: boolean }) {
  useFreshServerData();
  const confirm = useConfirm();
  const publish = useAction(() => publishResultsAction(event.id), { successMessage: 'Resultado publicado.', toastErrors: true });

  const onPublish = async () => {
    const ok = await confirm({
      title: 'Publicar o resultado?',
      description: 'A prova será finalizada: os tempos não poderão mais ser alterados e o sorteio não poderá ser refeito.',
      confirmLabel: 'Publicar resultado',
      cancelLabel: 'Ainda não',
    });
    if (ok) await publish.execute(undefined);
  };

  return <ResultsBoard event={event} runs={runs} published={published} publishing={publish.pending} onPublish={() => void onPublish()} />;
}
