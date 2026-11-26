'use client';

import { useEffect, useRef, useState } from 'react';
import type { Competitor } from '../../types/roping';
import { formBannerMessage } from '../../lib/actionResult';
import { useAction } from '../../lib/useAction';
import type { AthleteFormInput } from '../../lib/schemas/cadastros';
import { checkAthleteDuplicatesAction, createAthleteAction, updateAthleteAction } from '../../server/actions/athletes';
import { CityPicker, type CityValue } from '../locations/CityPicker';
import { Button, Dialog, Input } from '../ui';

type Duplicate = Awaited<ReturnType<typeof checkAthleteDuplicatesAction>> extends infer R
  ? R extends { ok: true; data: infer D } ? D extends Array<infer E> ? E : never : never
  : never;

export interface AthleteFormDialogProps {
  open: boolean;
  onClose: () => void;
  athlete?: Competitor;
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
  /** Gerente vê o dono de cada candidato a duplicado. */
  showOwner?: boolean;
  onSaved?: (athlete: Competitor) => void;
  onUseExisting?: (athleteId: string) => void;
}

const formatHandicap = (value: number | undefined) => (value === undefined ? '' : String(value));

export function AthleteFormDialog(props: AthleteFormDialogProps) {
  const { open, onClose, athlete } = props;
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} busy={busy} title={athlete ? 'Editar atleta' : 'Novo atleta'}>
      <AthleteForm key={athlete?.id ?? 'new'} {...props} onBusyChange={setBusy} />
    </Dialog>
  );
}

function AthleteForm({ onClose, athlete, states, defaultCity, showOwner = false, onSaved, onUseExisting, onBusyChange }: AthleteFormDialogProps & { onBusyChange: (busy: boolean) => void }) {
  const needsReview = Boolean(athlete?.cityNeedsReview);
  const startsUnknown = Boolean(athlete) && !needsReview
    && athlete?.cidade === undefined && athlete?.estado === undefined && athlete?.cityCode === undefined;
  const defaultValue: CityValue = { uf: defaultCity.uf, cityCode: defaultCity.code, cityName: defaultCity.name };
  const initialCity: CityValue = athlete && !startsUnknown
    ? needsReview || athlete.cityCode === undefined
      ? { uf: athlete.estado ?? defaultCity.uf, cityCode: null, cityName: '' }
      : { uf: athlete.estado ?? defaultCity.uf, cityCode: athlete.cityCode, cityName: athlete.cidade ?? '' }
    : defaultValue;

  const [name, setName] = useState(athlete?.nome ?? '');
  const [nickname, setNickname] = useState(athlete?.apelido ?? '');
  const [club, setClub] = useState(athlete?.clube ?? '');
  const [city, setCity] = useState<CityValue>(initialCity);
  const [cityUnknown, setCityUnknown] = useState(startsUnknown);
  const [cityLoading, setCityLoading] = useState(false);
  const [head, setHead] = useState(formatHandicap(athlete?.headHandicap));
  const [heel, setHeel] = useState(formatHandicap(athlete?.heelHandicap));
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null);
  const [checking, setChecking] = useState(false);
  const submitting = useRef(false);

  const saveAction = athlete
    ? (input: AthleteFormInput) => updateAthleteAction(athlete.id, input)
    : createAthleteAction;
  const save = useAction(saveAction, { successMessage: athlete ? 'Atleta atualizado.' : 'Atleta cadastrado.' });
  const busy = checking || save.pending;
  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  const input = (): AthleteFormInput => ({
    name,
    nickname,
    club,
    cityUnknown,
    cityCode: cityUnknown ? '' : city.cityCode ?? '',
    headHandicap: head,
    heelHandicap: heel,
  });

  const persist = async () => {
    const result = await save.execute(input());
    if (result?.ok) {
      onSaved?.(result.data);
      onClose();
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    try {
      if (!athlete && !cityUnknown && city.cityCode !== null) {
        setChecking(true);
        try {
          const check = await checkAthleteDuplicatesAction({ name, cityCode: city.cityCode, club });
          if (check.ok && check.data.length > 0) {
            setDuplicates(check.data);
            return;
          }
        } catch {
          // A verificação nunca bloqueia o cadastro.
        } finally {
          setChecking(false);
        }
      }
      await persist();
    } finally {
      submitting.current = false;
    }
  };

  const forceCreate = async () => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await persist();
    } finally {
      submitting.current = false;
    }
  };

  const errors = save.fieldErrors;
  const banner = formBannerMessage(save.message, errors);
  const cityError = errors.cityCode?.[0];

  return (
    <form noValidate onSubmit={(event) => void submit(event)} onChange={() => duplicates && setDuplicates(null)} className="flex flex-col gap-4">
      {banner && (
        <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {banner}
        </p>
      )}
      <Input label="Nome" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name?.[0]} maxLength={120} autoComplete="off" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Apelido" name="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} error={errors.nickname?.[0]} autoComplete="off" />
        <Input label="Clube" name="club" value={club} onChange={(e) => setClub(e.target.value)} error={errors.club?.[0]} autoComplete="off" />
      </div>
      <CityPicker
        states={states}
        defaultUf={initialCity.uf}
        defaultCity={initialCity.cityCode !== null ? { code: initialCity.cityCode, name: initialCity.cityName } : undefined}
        value={city}
        onChange={setCity} onLoadingChange={setCityLoading}
        allowUnknown
        unknown={cityUnknown}
        onUnknownChange={setCityUnknown}
        error={cityError}
        hint={needsReview && athlete?.cidade ? `Cidade anterior: ${athlete.cidade}` : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Handicap de cabeceiro" name="headHandicap" inputMode="decimal" value={head} onChange={(e) => setHead(e.target.value)} error={errors.headHandicap?.[0]} />
        <Input label="Handicap de pezeiro" name="heelHandicap" inputMode="decimal" value={heel} onChange={(e) => setHeel(e.target.value)} error={errors.heelHandicap?.[0]} />
        <p className="text-xs text-ink-muted sm:col-span-2">Preencha ao menos um dos dois.</p>
      </div>

      {duplicates && (
        <div role="alert" className="flex flex-col gap-3 rounded-ui border border-warning bg-warning-soft p-4 text-sm text-ink-strong">
          <p className="font-display text-base font-bold uppercase tracking-wide">Possível atleta já cadastrado</p>
          <ul className="flex flex-col gap-1">
            {duplicates.map((d) => (
              <li key={d.id} className="break-words">
                {[d.name, `${d.city ?? ''}/${d.state ?? ''}`, d.club].filter(Boolean).join(' · ')}
                {showOwner && d.ownerName ? ` de ${d.ownerName}` : ''}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {onUseExisting && (
              <Button
                variant="secondary"
                onClick={() => {
                  onClose();
                  onUseExisting(duplicates[0].id);
                }}
              >
                Usar o existente
              </Button>
            )}
            <Button variant="ghost" loading={busy} onClick={() => void forceCreate()}>
              Cadastrar mesmo assim
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={cityLoading && !cityUnknown} loading={busy}>
          Salvar atleta
        </Button>
      </div>
    </form>
  );
}
