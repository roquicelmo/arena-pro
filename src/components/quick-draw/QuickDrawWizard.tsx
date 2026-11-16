'use client';

import { useMemo, useState } from 'react';
import { Download, UserPlus } from 'lucide-react';
import type { Competitor, DrawConfig, Run } from '../../types/roping';
import { DEFAULT_DRAW_CONFIG } from '../../lib/drawDefaults';
import { useAction } from '../../lib/useAction';
import { quickDrawAction } from '../../server/actions/draws';
import { AthleteFormDialog } from '../athletes/AthleteFormDialog';
import { DrawReview } from '../draw/DrawReview';
import { DrawSetup } from '../draw/DrawSetup';
import { Button, cn, Input, toast } from '../ui';
import { ParticipantPicker } from './ParticipantPicker';

type Step = 'participantes' | 'configuracao' | 'revisao';
const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'participantes', label: 'Participantes' },
  { id: 'configuracao', label: 'Configuração' },
  { id: 'revisao', label: 'Revisão e PDF' },
];

interface Props {
  athletes: Competitor[];
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
  canFilterOwners: boolean;
}

const asHead = (a: Competitor): Competitor => ({ ...a, handicap: a.headHandicap ?? a.handicap });
const asHeel = (a: Competitor): Competitor => ({ ...a, handicap: a.heelHandicap ?? a.handicap });

/** Sorteio avulso em etapas; nada é salvo, o PDF sai das corridas revisadas (spec 6.8). */
export function QuickDrawWizard({ athletes, states, defaultCity, canFilterOwners }: Props) {
  const [step, setStep] = useState<Step>('participantes');
  const [cabIds, setCabIds] = useState<Set<string>>(new Set());
  const [peIds, setPeIds] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<DrawConfig>({ ...DEFAULT_DRAW_CONFIG });
  const [runs, setRuns] = useState<Run[]>([]);
  const [header, setHeader] = useState({ title: '', date: '', place: '' });
  const [titleError, setTitleError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const draw = useAction(quickDrawAction, { toastErrors: true });

  const cabeceiros = useMemo(() => athletes.filter((a) => cabIds.has(a.id)).map(asHead), [athletes, cabIds]);
  const pezeiros = useMemo(() => athletes.filter((a) => peIds.has(a.id)).map(asHeel), [athletes, peIds]);

  const generate = async () => {
    const result = await draw.execute({ cabeceiroIds: [...cabIds], pezeiroIds: [...peIds], config });
    if (result?.ok) {
      setRuns(result.data);
      setStep('revisao');
      toast.success('Sorteio gerado.');
    }
  };

  const downloadPdf = async () => {
    if (header.title.trim().length < 2) {
      setTitleError('Informe o título do sorteio.');
      return;
    }
    setTitleError('');
    setDownloading(true);
    try {
      const response = await fetch('/sorteio-avulso/sumula.pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...header,
          runs: runs.map((r) => ({ numero: r.numero, bateria: r.bateria, cabeceiroId: r.cabeceiro.id, pezeiroId: r.pezeiro.id, cabeceiroGrupo: r.cabeceiroGrupo, pezeiroGrupo: r.pezeiroGrupo })),
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? 'Não foi possível gerar o PDF.');
      }
      const filename = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') ?? '')?.[1] ?? 'sorteio.pdf';
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('PDF baixado.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar o PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const index = STEPS.findIndex((s) => s.id === step);
  return (
    <div className="grid gap-6">
      <nav aria-label="Etapas do sorteio avulso">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s.id} aria-current={s.id === step ? 'step' : undefined}
              className={cn('rounded-ui px-3 py-1.5 font-display text-sm font-bold uppercase tracking-wide', s.id === step ? 'bg-ink-strong text-sand' : i < index ? 'bg-nav text-ink-strong' : 'bg-surface text-ink-muted')}>
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>
      </nav>

      {step === 'participantes' && (
        <>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Novo atleta</Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ParticipantPicker title="Cabeceiros" athletes={athletes} selected={cabIds} onChange={setCabIds} handicapOf={(a) => a.headHandicap} />
            <ParticipantPicker title="Pezeiros" athletes={athletes} selected={peIds} onChange={setPeIds} handicapOf={(a) => a.heelHandicap} />
          </div>
          <div className="flex justify-end">
            <Button size="lg" disabled={!cabIds.size || !peIds.size} onClick={() => setStep('configuracao')}>Avançar para configuração</Button>
          </div>
        </>
      )}

      {step === 'configuracao' && (
        <>
          <DrawSetup config={config} onChange={setConfig} cabeceiros={cabeceiros} pezeiros={pezeiros} disabled={draw.pending} />
          <div className="flex flex-wrap justify-between gap-2">
            <Button variant="secondary" onClick={() => setStep('participantes')}>Voltar</Button>
            <Button size="lg" loading={draw.pending} onClick={() => void generate()}>Gerar sorteio</Button>
          </div>
        </>
      )}

      {step === 'revisao' && (
        <>
          <section className="grid gap-3 rounded-ui border border-line bg-surface p-4 md:grid-cols-[2fr_1fr_1fr]" aria-label="Cabeçalho do PDF">
            <Input label="Título do sorteio" value={header.title} error={titleError} onChange={(e) => setHeader({ ...header, title: e.target.value })} placeholder="Ex.: Copa do Clube 2026" />
            <Input label="Data" type="date" value={header.date} onChange={(e) => setHeader({ ...header, date: e.target.value })} />
            <Input label="Local" value={header.place} onChange={(e) => setHeader({ ...header, place: e.target.value })} placeholder="Arena ou cidade" />
          </section>
          <div className="flex flex-wrap justify-between gap-2">
            <span className="flex gap-2">
              <Button variant="secondary" onClick={() => setStep('configuracao')}>Voltar à configuração</Button>
              <Button variant="secondary" loading={draw.pending} onClick={() => void generate()}>Refazer sorteio</Button>
            </span>
            <Button size="lg" loading={downloading} onClick={() => void downloadPdf()}><Download className="h-4 w-4" aria-hidden="true" /> Baixar PDF</Button>
          </div>
          <DrawReview runs={runs} />
        </>
      )}

      <AthleteFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} states={states} defaultCity={defaultCity} showOwner={canFilterOwners} />
    </div>
  );
}
