'use client';

import { useEffect, useState } from 'react';
import { formBannerMessage } from '../../lib/actionResult';
import { useAction } from '../../lib/useAction';
import type { EventFormInput } from '../../lib/schemas/cadastros';
import { createEventAction, updateEventAction } from '../../server/actions/events';
import type { ArenaOption } from '../../types/arenas';
import type { EventSummary } from '../../types/events';
import { CityPicker, type CityValue } from '../locations/CityPicker';
import { Button, Dialog, Input, Select } from '../ui';

export interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  event?: EventSummary;
  arenas: ArenaOption[];
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
}

export function EventFormDialog(props: EventFormDialogProps) {
  const { open, onClose, event } = props;
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} busy={busy} title={event ? 'Editar prova' : 'Nova prova'}>
      <EventForm key={event?.id ?? 'new'} {...props} onBusyChange={setBusy} />
    </Dialog>
  );
}

function EventForm({ onClose, event, arenas, states, defaultCity, onBusyChange }: EventFormDialogProps & { onBusyChange: (busy: boolean) => void }) {
  const [name, setName] = useState(event?.name ?? '');
  const [date, setDate] = useState(event?.isoDate ?? '');
  const [arenaId, setArenaId] = useState('');
  const [arenaName, setArenaName] = useState('');
  const [city, setCity] = useState<CityValue>({ uf: defaultCity.uf, cityCode: defaultCity.code, cityName: defaultCity.name });

  const saveAction = event
    ? (input: EventFormInput) => updateEventAction(event.id, { name: input.name, eventDate: input.eventDate })
    : createEventAction;
  const save = useAction(saveAction, { successMessage: event ? 'Prova atualizada.' : 'Prova criada.' });
  useEffect(() => {
    onBusyChange(save.pending);
  }, [save.pending, onBusyChange]);

  const submit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    const input: EventFormInput = { name, eventDate: date };
    if (!event) {
      if (arenaId) input.arenaId = arenaId;
      else {
        input.arenaName = arenaName;
        input.cityCode = city.cityCode ?? '';
      }
    }
    const result = await save.execute(input);
    if (result?.ok) onClose();
  };

  const errors = save.fieldErrors;
  const banner = formBannerMessage(save.message, errors);
  const newArena = !event && !arenaId;

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      {banner && (
        <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {banner}
        </p>
      )}
      <Input label="Nome da prova" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name?.[0]} maxLength={160} autoComplete="off" />
      <Input label="Data" name="eventDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.eventDate?.[0]} />
      {event ? (
        <p className="break-words text-sm text-ink-muted">Arena: {event.arena}</p>
      ) : (
        <>
          <Select label="Arena" name="arenaId" value={arenaId} onChange={(e) => setArenaId(e.target.value)} error={errors.arenaId?.[0]}>
            <option value="">Cadastrar nova arena</option>
            {arenas.map((arena) => (
              <option key={arena.id} value={arena.id}>
                {arena.name} · {arena.city}/{arena.state}
              </option>
            ))}
          </Select>
          {newArena && (
            <>
              <Input label="Nome da nova arena" name="arenaName" value={arenaName} onChange={(e) => setArenaName(e.target.value)} error={errors.arenaName?.[0]} maxLength={120} autoComplete="off" />
              <CityPicker states={states} defaultUf={defaultCity.uf} defaultCity={{ code: defaultCity.code, name: defaultCity.name }} value={city} onChange={setCity} error={errors.cityCode?.[0]} />
            </>
          )}
        </>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={save.pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          Salvar prova
        </Button>
      </div>
    </form>
  );
}
