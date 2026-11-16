'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RunsTable } from '../../../../../src/components/RunsTable';
import { toast, useConfirm } from '../../../../../src/components/ui';
import { apiRequest } from '../../../../../src/lib/apiClient';
import { DEFAULT_DRAW_CONFIG } from '../../../../../src/lib/drawDefaults';
import type { Run } from '../../../../../src/types/roping';
import { calculateRunTotal } from '../../../../../src/utils/drawAlgorithm';

interface TrackClientProps {
  eventId: string;
  runs: Run[];
}

type Bull = 1 | 2 | 3;
type SaveStatus = 'idle' | 'saving' | 'saved';

/** Espera entre a última tecla e o PATCH, para não gravar valores parciais fora de ordem. */
const SAVE_DELAY_MS = 500;
const SAVE_ERROR = 'O tempo foi alterado localmente, mas não pôde ser salvo no banco.';

const ntOf = (run: Run, boi: Bull) => Boolean(boi === 1 ? run.times.boi1Nt : boi === 2 ? run.times.boi2Nt : run.times.boi3Nt);

const withTime = (run: Run, boi: Bull, value: string, isNt?: boolean): Run => {
  const times = { ...run.times };
  if (boi === 1) {
    if (isNt !== undefined) times.boi1Nt = isNt;
    times.boi1 = value;
  } else if (boi === 2) {
    if (isNt !== undefined) times.boi2Nt = isNt;
    times.boi2 = value;
  } else {
    if (isNt !== undefined) times.boi3Nt = isNt;
    times.boi3 = value;
  }
  const candidate: Run = { ...run, times };
  const { totalTime, mediaFinal, isNt: runNt } = calculateRunTotal(candidate);
  return { ...candidate, totalTime, mediaFinal, isNt: runNt };
};

const hasAnyTime = (run: Run) =>
  Boolean(run.times.boi1 || run.times.boi2 || run.times.boi3 || run.times.boi1Nt || run.times.boi2Nt || run.times.boi3Nt);

const patchTime = (runId: string, bullNumber: number, timeSeconds: number | null, isNt: boolean) =>
  apiRequest(`/api/runs/${runId}/times`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bullNumber, timeSeconds, isNt }),
  }, SAVE_ERROR);

export function TrackClient({ eventId, runs: initialRuns }: TrackClientProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [runs, setRuns] = useState(initialRuns);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const runsRef = useRef(runs);
  const pendingSaves = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>());
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    runsRef.current = runs;
  }, [runs]);

  // Ao sair da tela, grava imediatamente o que ainda estava aguardando.
  useEffect(() => {
    const saves = pendingSaves.current;
    const timer = statusTimer;
    return () => {
      for (const { timer: pending, run } of saves.values()) {
        clearTimeout(pending);
        run();
      }
      saves.clear();
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const showSaved = () => {
    setSaveStatus('saved');
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setSaveStatus('idle'), 4000);
  };

  const persist = async (runId: string, boi: Bull, timeSeconds: number | null, isNt: boolean) => {
    setSaveStatus('saving');
    try {
      await patchTime(runId, boi, timeSeconds, isNt);
    } catch (error) {
      setSaveStatus('idle');
      toast.error(error instanceof Error ? error.message : SAVE_ERROR);
      return;
    }
    showSaved();
  };

  const schedule = (key: string, delay: number, run: () => void) => {
    const saves = pendingSaves.current;
    const existing = saves.get(key);
    if (existing) clearTimeout(existing.timer);
    const timer = setTimeout(() => {
      saves.delete(key);
      run();
    }, delay);
    saves.set(key, { timer, run });
  };

  // Lógica movida de `handleUpdateTime` do App.tsx: atualiza a corrida na hora e grava no banco.
  const onUpdateTime = (runId: string, boi: Bull, value: string, isNt?: boolean) => {
    const currentRun = runsRef.current.find((run) => run.id === runId);
    if (!currentRun) return;
    const nextRuns = runsRef.current.map((run) => (run.id === runId ? withTime(run, boi, value, isNt) : run));
    runsRef.current = nextRuns;
    setRuns(nextRuns);

    const normalized = value.trim().replace(',', '.');
    const timeSeconds = normalized === '' ? null : Number(normalized);
    // Valor parcial ou inválido ("8,", "abc"): fica só na tela até virar um número.
    if (timeSeconds !== null && !Number.isFinite(timeSeconds)) return;
    const nt = isNt ?? ntOf(currentRun, boi);
    // NT e limpar gravam na hora; digitação espera a pausa.
    schedule(`${runId}:${boi}`, isNt === undefined ? SAVE_DELAY_MS : 0, () => void persist(runId, boi, timeSeconds, nt));
  };

  const onClearAllTimes = async () => {
    const confirmed = await confirm({
      title: 'Limpar todos os tempos?',
      description: 'Os tempos e NTs lançados nesta prova serão apagados.',
      confirmLabel: 'Limpar tempos',
      cancelLabel: 'Manter tempos',
      tone: 'danger',
    });
    if (!confirmed) return;
    for (const { timer } of pendingSaves.current.values()) clearTimeout(timer);
    pendingSaves.current.clear();

    const withTimes = runsRef.current.filter(hasAnyTime);
    const cleared = runsRef.current.map((run) => ({
      ...run,
      times: { boi1: '', boi2: '', boi3: '', boi1Nt: false, boi2Nt: false, boi3Nt: false },
      totalTime: null,
      mediaFinal: null,
      isNt: false,
    }));
    runsRef.current = cleared;
    setRuns(cleared);

    const results = await Promise.allSettled(withTimes.flatMap((run) =>
      Array.from({ length: run.bois }, (_, index) => patchTime(run.id, index + 1, null, false)),
    ));
    if (results.some((result) => result.status === 'rejected')) {
      toast.error('Alguns tempos não puderam ser apagados no banco.');
      router.refresh();
      return;
    }
    toast.success('Tempos limpos.');
  };

  const goToDraw = () => router.push(`/provas/${eventId}/sorteio`);

  return (
    <>
      <RunsTable
        runs={runs}
        config={DEFAULT_DRAW_CONFIG}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onReDraw={goToDraw}
        onBackToConfig={goToDraw}
        onUpdateTime={onUpdateTime}
        onClearAllTimes={() => void onClearAllTimes()}
      />
      <p
        role="status"
        aria-live="polite"
        className={
          saveStatus === 'idle'
            ? 'sr-only'
            : 'fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-ui border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-strong shadow-sm no-print'
        }
      >
        {saveStatus === 'saving' ? 'Salvando tempo…' : saveStatus === 'saved' ? 'Tempo salvo' : ''}
      </p>
    </>
  );
}
