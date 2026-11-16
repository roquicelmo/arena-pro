'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { DrawConfiguration } from '../../../src/components/DrawConfiguration';
import { AthleteFormDialog } from '../../../src/components/athletes/AthleteFormDialog';
import { RunsTable } from '../../../src/components/RunsTable';
import { TransferList } from '../../../src/components/TransferList';
import { WizardHeader } from '../../../src/components/WizardHeader';
import { DEFAULT_DRAW_CONFIG } from '../../../src/lib/drawDefaults';
import type { Competitor, DrawConfig, Run, WizardStep } from '../../../src/types/roping';
import { calculateRunTotal, executeGroupCrossDraw } from '../../../src/utils/drawAlgorithm';

interface QuickDrawClientProps {
  athletes: Competitor[];
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
  canFilterOwners?: boolean;
}

const EMPTY_TIMES: Run['times'] = { boi1: '', boi2: '', boi3: '', boi1Nt: false, boi2Nt: false, boi3Nt: false };

/** Wizard do sorteio avulso: tudo em estado local, nada é persistido (PDF na fase 3). */
export function QuickDrawClient({ athletes, states, defaultCity, canFilterOwners = false }: QuickDrawClientProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [pezeiros, setPezeiros] = useState<Competitor[]>([]);
  const [cabeceiros, setCabeceiros] = useState<Competitor[]>([]);
  const [config, setConfig] = useState<DrawConfig>({ ...DEFAULT_DRAW_CONFIG });
  const [runs, setRuns] = useState<Run[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const without = (selected: Competitor[]) => athletes.filter((a) => !selected.some((s) => s.id === a.id));

  const generate = () => {
    const { runs: generated } = executeGroupCrossDraw(cabeceiros, pezeiros, config);
    setRuns(generated);
    setSearchTerm('');
    setStep(4);
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#f59e0b', '#3b82f6', '#10b981', '#a855f7'] });
    } catch {
      // efeito decorativo
    }
  };

  const updateTime = (runId: string, boi: 1 | 2 | 3, value: string, isNt?: boolean) => {
    setRuns((prev) => prev.map((run) => {
      if (run.id !== runId) return run;
      const times = { ...run.times };
      if (boi === 1) { if (isNt !== undefined) times.boi1Nt = isNt; times.boi1 = value; }
      if (boi === 2) { if (isNt !== undefined) times.boi2Nt = isNt; times.boi2 = value; }
      if (boi === 3) { if (isNt !== undefined) times.boi3Nt = isNt; times.boi3 = value; }
      const candidate: Run = { ...run, times };
      const { totalTime, mediaFinal, isNt: runNt } = calculateRunTotal(candidate);
      return { ...candidate, totalTime, mediaFinal, isNt: runNt };
    }));
  };

  const clearTimes = () => {
    setRuns((prev) => prev.map((run) => ({ ...run, times: { ...EMPTY_TIMES }, totalTime: null, mediaFinal: null, isNt: false })));
  };

  return (
    <>
      <div className="no-print">
        <WizardHeader
          currentStep={step}
          onStepClick={setStep}
          pezeirosCount={pezeiros.length}
          cabeceirosCount={cabeceiros.length}
          hasDrawResults={runs.length > 0}
        />
      </div>

      {step === 1 && (
        <TransferList
          title="Seleção de Pezeiros"
          role="pezeiro"
          availableItems={without(pezeiros)}
          selectedItems={pezeiros}
          onSelect={(c) => setPezeiros((prev) => [...prev, c])}
          onDeselect={(c) => setPezeiros((prev) => prev.filter((p) => p.id !== c.id))}
          onSelectAll={() => setPezeiros([...athletes])}
          onClearAll={() => setPezeiros([])}
          onNext={() => setStep(2)}
          nextButtonLabel="Avançar para cabeceiros"
          onOpenAddModal={() => setIsModalOpen(true)}
        />
      )}

      {step === 2 && (
        <TransferList
          title="Seleção de Cabeceiros"
          role="cabeceiro"
          availableItems={without(cabeceiros)}
          selectedItems={cabeceiros}
          onSelect={(c) => setCabeceiros((prev) => [...prev, c])}
          onDeselect={(c) => setCabeceiros((prev) => prev.filter((p) => p.id !== c.id))}
          onSelectAll={() => setCabeceiros([...athletes])}
          onClearAll={() => setCabeceiros([])}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          nextButtonLabel="Avançar para configuração"
          onOpenAddModal={() => setIsModalOpen(true)}
        />
      )}

      {step === 3 && (
        <DrawConfiguration
          config={config}
          onChangeConfig={setConfig}
          pezeiros={pezeiros}
          cabeceiros={cabeceiros}
          onGenerateDraw={generate}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <RunsTable
          runs={runs}
          config={config}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onReDraw={generate}
          onBackToConfig={() => setStep(3)}
          onUpdateTime={updateTime}
          onClearAllTimes={clearTimes}
        />
      )}

      <AthleteFormDialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        states={states}
        defaultCity={defaultCity}
        showOwner={canFilterOwners}
      />
    </>
  );
}
