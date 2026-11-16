'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { listMunicipalitiesAction } from '../../server/actions/arenas';
import { normalizeName } from '../../lib/text';
import { Input, Select } from '../ui';

type Municipality = { code: number; name: string };

export interface CityValue {
  uf: string;
  cityCode: number | null;
  cityName: string;
}

export interface CityPickerProps {
  states: Array<{ uf: string; name: string }>;
  defaultUf: string;
  defaultCity?: { code: number; name: string };
  error?: string;
  hint?: string;
  /** Opcional: com `value`, o formulário controla UF e cidade. */
  value?: CityValue;
  onChange?: (value: CityValue) => void;
}

const findCode = (list: Municipality[] | undefined, name: string): number | null => {
  const wanted = normalizeName(name);
  if (!wanted || !list) return null;
  return list.find((city) => normalizeName(city.name) === wanted)?.code ?? null;
};

export function CityPicker({ states, defaultUf, defaultCity, error, hint, value, onChange }: CityPickerProps) {
  const [internal, setInternal] = useState<CityValue>({
    uf: defaultUf,
    cityCode: defaultCity?.code ?? null,
    cityName: defaultCity?.name ?? '',
  });
  const current = value ?? internal;
  const [lists, setLists] = useState<Record<string, Municipality[]>>({});
  const requested = useRef(new Set<string>());
  const listId = useId();

  const emit = (next: CityValue) => {
    setInternal(next);
    onChange?.(next);
  };

  // Cidade conhecida antes de a lista carregar: a inicial (já tem código).
  const resolve = (uf: string, name: string, list: Municipality[] | undefined): number | null => {
    const fromList = findCode(list, name);
    if (fromList) return fromList;
    if (!list && defaultCity && uf === defaultUf && normalizeName(name) === normalizeName(defaultCity.name)) return defaultCity.code;
    return null;
  };

  useEffect(() => {
    const { uf } = current;
    if (!uf || requested.current.has(uf)) return;
    requested.current.add(uf);
    void listMunicipalitiesAction(uf).then((result) => {
      if (result.ok) setLists((prev) => ({ ...prev, [uf]: result.data }));
      else requested.current.delete(uf);
    }).catch(() => requested.current.delete(uf));
  }, [current]);

  const list = lists[current.uf];
  useEffect(() => {
    // A lista chegou depois do texto: resolve o código que ficou pendente.
    if (!list) return;
    const code = findCode(list, current.cityName);
    if (code !== current.cityCode) emit({ ...current, cityCode: code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Select
        label="UF"
        value={current.uf}
        onChange={(event) => emit({ uf: event.target.value, cityCode: null, cityName: '' })}
      >
        {states.map((state) => (
          <option key={state.uf} value={state.uf}>
            {state.uf} · {state.name}
          </option>
        ))}
      </Select>
      <div>
        <Input
          label="Cidade"
          list={listId}
          autoComplete="off"
          value={current.cityName}
          error={error}
          hint={hint}
          onChange={(event) => {
            const cityName = event.target.value;
            emit({ uf: current.uf, cityName, cityCode: resolve(current.uf, cityName, list) });
          }}
        />
        <datalist id={listId}>
          {(list ?? []).map((city) => (
            <option key={city.code} value={city.name} />
          ))}
        </datalist>
        <input type="hidden" name="cityCode" value={current.cityCode ?? ''} />
      </div>
    </div>
  );
}
