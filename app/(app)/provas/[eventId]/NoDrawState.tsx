import Link from 'next/link';
import { Shuffle } from 'lucide-react';
import { EmptyState } from '../../../../src/components/ui';

/** Estado vazio das abas que dependem de um sorteio gerado. */
export function NoDrawState({ eventId }: { eventId: string }) {
  return (
    <EmptyState
      icon={Shuffle}
      title="Nenhum sorteio gerado"
      description="Gere o sorteio da prova a partir das inscrições para abrir esta tela."
      action={
        <Link
          href={`/provas/${eventId}/sorteio`}
          className="inline-flex h-10 items-center justify-center rounded-ui bg-accent px-4 font-display text-[0.95rem] font-semibold uppercase tracking-wide text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sand"
        >
          Ir para o sorteio
        </Link>
      }
    />
  );
}
