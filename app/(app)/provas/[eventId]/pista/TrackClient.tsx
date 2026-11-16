'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrackBoard } from '../../../../../src/components/track/TrackBoard';
import { createSerialQueue } from '../../../../../src/lib/serialQueue';
import { toast, useConfirm } from '../../../../../src/components/ui';
import { apiRequest, SessionExpiredError } from '../../../../../src/lib/apiClient';
import type { Run } from '../../../../../src/types/roping';
import { calculateRunTotal } from '../../../../../src/utils/drawAlgorithm';
import { trackSave, useFreshServerData } from '../useFreshServerData';

interface TrackClientProps {
  runs: Run[];
}

type Bull = 1 | 2 | 3;
type SaveStatus = 'idle' | 'saving' | 'saved';

/** Espera entre a última tecla e o PATCH, para não gravar valores parciais fora de ordem. */
const SAVE_DELAY_MS = 500;
const SESSION_EXPIRED_ERROR = 'Sessão expirada — tempos não salvos. Entre novamente.';
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

/** Gravações do mesmo boi saem em série, na ordem da digitação (o banco fica com o último valor). */
const enqueueSave = createSerialQueue();

const patchTime = (runId: string, bullNumber: number, timeSeconds: number | null, isNt: boolean) =>
  trackSave(enqueueSave(`${runId}:${bullNumber}`, () => apiRequest(`/api/runs/${runId}/times`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bullNumber, timeSeconds, isNt }),
    // keepalive: a gravação termina mesmo se a aba fechar logo depois (pagehide).
    keepalive: true,
  }, SAVE_ERROR)));

export function TrackClient({ runs: initialRuns }: TrackClientProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const [runs, setRuns] = useState(initialRuns);
  const [seed, setSeed] = useState(initialRuns);
  /** Tempos editados aqui que ainda não terminaram de gravar. */
  const [unsaved, setUnsaved] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const runsRef = useRef(runs);
  /** Instante do refresh pedido ao montar (0 = nenhum pendente) e da última edição local. */
  const mountRefreshAt = useRef(0);
  const lastEditAt = useRef(0);
  const pendingSaves = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>());
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dados novos do servidor (router.refresh, voltar/avançar): ressincroniza o estado
  // local, a menos que ainda haja edição local aguardando gravação.
  if (seed !== initialRuns) {
    setSeed(initialRuns);
    // Um refresh pedido na montagem, antes da última edição local, traz dados anteriores a ela.
    const staleMountRefresh = mountRefreshAt.current > 0 && lastEditAt.current > mountRefreshAt.current;
    if (unsaved === 0 && !staleMountRefresh) setRuns(initialRuns);
    mountRefreshAt.current = 0;
  }

  useEffect(() => {
    runsRef.current = runs;
  }, [runs]);

  useFreshServerData(() => {
    mountRefreshAt.current = Date.now();
  });

  // Ao sair da tela (navegação ou fechar a aba), grava imediatamente o que ainda estava aguardando.
  useEffect(() => {
    const saves = pendingSaves.current;
    const timer = statusTimer;
    const flush = () => {
      for (const { timer: pending, run } of saves.values()) {
        clearTimeout(pending);
        run();
      }
      saves.clear();
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
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
      if (error instanceof SessionExpiredError) {
        // O valor continua na tela, mas não chegou ao banco: o aviso precisa ser claro e durar até o redirecionamento.
        toast.error(SESSION_EXPIRED_ERROR, { id: 'session-expired', duration: Infinity });
      } else {
        toast.error(error instanceof Error ? error.message : SAVE_ERROR);
      }
      return;
    } finally {
      setUnsaved((count) => Math.max(0, count - 1));
    }
    showSaved();
  };

  const schedule = (key: string, delay: number, run: () => void) => {
    const saves = pendingSaves.current;
    const existing = saves.get(key);
    if (existing) clearTimeout(existing.timer);
    else setUnsaved((count) => count + 1);
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
    lastEditAt.current = Date.now();
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
    const dropped = pendingSaves.current.size;
    for (const { timer } of pendingSaves.current.values()) clearTimeout(timer);
    pendingSaves.current.clear();
    setUnsaved((count) => Math.max(0, count - dropped));

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
      // O refresh traz o estado real do banco e a ressincronização acima o aplica.
      mountRefreshAt.current = 0;
      router.refresh();
      return;
    }
    toast.success('Tempos limpos.');
  };


  return (
    <>
      <TrackBoard runs={runs} onUpdateTime={onUpdateTime} onClearAllTimes={() => void onClearAllTimes()} />
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
