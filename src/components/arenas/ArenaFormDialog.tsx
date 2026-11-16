'use client';

import { useEffect, useState } from 'react';
import { formBannerMessage } from '../../lib/actionResult';
import { useAction } from '../../lib/useAction';
import type { ArenaFormInput } from '../../lib/schemas/cadastros';
import { createArenaAction, updateArenaAction } from '../../server/actions/arenas';
import type { ArenaOption } from '../../types/arenas';
import { CityPicker, type CityValue } from '../locations/CityPicker';
import { Button, Dialog, Input } from '../ui';

export interface ArenaFormDialogProps {
  open: boolean;
  onClose: () => void;
  arena?: ArenaOption;
  states: Array<{ uf: string; name: string }>;
  defaultCity: { code: number; name: string; uf: string };
}

export function ArenaFormDialog(props: ArenaFormDialogProps) {
  const { open, onClose, arena } = props;
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} busy={busy} title={arena ? 'Editar arena' : 'Nova arena'}>
      <ArenaForm key={arena?.id ?? 'new'} {...props} onBusyChange={setBusy} />
    </Dialog>
  );
}

function ArenaForm({ onClose, arena, states, defaultCity, onBusyChange }: ArenaFormDialogProps & { onBusyChange: (busy: boolean) => void }) {
  const known = arena?.cityCode !== undefined;
  const initial: CityValue = arena
    ? known
      ? { uf: arena.state, cityCode: arena.cityCode ?? null, cityName: arena.city }
      : { uf: arena.state || defaultCity.uf, cityCode: null, cityName: '' }
    : { uf: defaultCity.uf, cityCode: defaultCity.code, cityName: defaultCity.name };
  const [name, setName] = useState(arena?.name ?? '');
  const [city, setCity] = useState<CityValue>(initial);

  const saveAction = arena ? (input: ArenaFormInput) => updateArenaAction(arena.id, input) : createArenaAction;
  const save = useAction(saveAction, { successMessage: arena ? 'Arena atualizada.' : 'Arena cadastrada.' });
  useEffect(() => {
    onBusyChange(save.pending);
  }, [save.pending, onBusyChange]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await save.execute({ name, cityCode: city.cityCode ?? '' });
    if (result?.ok) onClose();
  };

  const errors = save.fieldErrors;
  const banner = formBannerMessage(save.message, errors);
  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      {banner && (
        <p role="alert" className="rounded-ui bg-danger-soft px-3 py-2 text-sm font-medium text-danger">
          {banner}
        </p>
      )}
      <Input label="Nome" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name?.[0]} maxLength={120} autoComplete="off" />
      <CityPicker
        states={states}
        defaultUf={initial.uf}
        defaultCity={initial.cityCode !== null ? { code: initial.cityCode, name: initial.cityName } : undefined}
        value={city}
        onChange={setCity}
        error={errors.cityCode?.[0]}
        hint={arena && !known && arena.city ? `Cidade anterior: ${arena.city}` : undefined}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={save.pending}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.pending}>
          Salvar arena
        </Button>
      </div>
    </form>
  );
}
