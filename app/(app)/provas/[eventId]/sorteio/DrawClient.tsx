'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Lock } from 'lucide-react';
import { DrawReview } from '../../../../../src/components/draw/DrawReview';
import { DrawSetup } from '../../../../../src/components/draw/DrawSetup';
import { Button, useConfirm } from '../../../../../src/components/ui';
import { useAction } from '../../../../../src/lib/useAction';
import { generateDrawAction } from '../../../../../src/server/actions/draws';
import type { Competitor, DrawConfig, Run } from '../../../../../src/types/roping';

const LOCK_TEXT = {
  times: 'Não é possível refazer: já há tempos lançados.',
  published: 'Não é possível refazer: o resultado já foi publicado.',
} as const;

interface DrawClientProps {
  eventId: string;
  cabeceiros: Competitor[];
  pezeiros: Competitor[];
  initialConfig: DrawConfig;
  runs: Run[];
  version: number | null;
  lockReason: 'times' | 'published' | null;
}

const celebrate = () => {
  void import('canvas-confetti')
    .then(({ default: confetti }) => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#a6670f', '#2a1f16', '#efe7da'] }))
    .catch(() => undefined);
};

export function DrawClient({ eventId, cabeceiros, pezeiros, initialConfig, runs, version, lockReason }: DrawClientProps) {
  const confirm = useConfirm();
  const [config, setConfig] = useState<DrawConfig>(initialConfig);
  const generate = useAction((value: DrawConfig) => generateDrawAction(eventId, value), {
    successMessage: (data) => `Sorteio gerado (versão ${data.version}).`,
    toastErrors: true,
  });
  const hasDraw = runs.length > 0;
  const locked = lockReason !== null;
  const canGenerate = cabeceiros.length > 0 && pezeiros.length > 0;

  const onGenerate = async () => {
    if (hasDraw) {
      const ok = await confirm({
        title: 'Refazer o sorteio?',
        description: 'Uma nova versão substitui a atual. Súmulas já impressas ficam desatualizadas.',
        confirmLabel: 'Refazer sorteio',
        cancelLabel: 'Manter atual',
        tone: 'danger',
      });
      if (!ok) return;
    }
    const result = await generate.execute(config);
    if (result?.ok) celebrate();
  };

  return (
    <div className="grid gap-6">
      <DrawSetup config={config} onChange={setConfig} cabeceiros={cabeceiros} pezeiros={pezeiros} disabled={locked || generate.pending} />
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
        {locked && (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <Lock className="h-4 w-4" aria-hidden="true" /> {LOCK_TEXT[lockReason]}
          </p>
        )}
        <Button size="lg" loading={generate.pending} disabled={locked || !canGenerate} onClick={() => void onGenerate()}>
          {hasDraw ? 'Refazer sorteio' : 'Gerar sorteio'}
        </Button>
      </div>

      {hasDraw && (
        <section className="grid gap-3" aria-labelledby="draw-current">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="draw-current" className="font-display text-2xl font-bold uppercase tracking-wide text-ink-strong">
              Sorteio atual{version ? ` · versão ${version}` : ''}
            </h2>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/provas/${eventId}/sorteio/sumula.pdf`}
                className="inline-flex h-10 items-center gap-2 rounded-ui bg-accent px-4 font-display text-[0.95rem] font-semibold uppercase tracking-wide text-on-accent hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4" aria-hidden="true" /> Baixar súmula (PDF)
              </a>
              <Link href={`/provas/${eventId}/pista`} className="inline-flex h-10 items-center rounded-ui border border-line bg-surface px-4 font-display text-[0.95rem] font-semibold uppercase tracking-wide text-ink-strong hover:bg-nav">
                Ir para a pista
              </Link>
            </div>
          </div>
          <DrawReview runs={runs} />
        </section>
      )}
    </div>
  );
}
