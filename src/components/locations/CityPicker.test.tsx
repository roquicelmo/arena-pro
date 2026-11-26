// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CityPicker } from './CityPicker';

const { listMunicipalitiesAction } = vi.hoisted(() => ({ listMunicipalitiesAction: vi.fn() }));
vi.mock('../../server/actions/arenas', () => ({ listMunicipalitiesAction }));

const STATES = [{ uf: 'GO', name: 'Goiás' }, { uf: 'MG', name: 'Minas Gerais' }];
const LISTS: Record<string, Array<{ code: number; name: string }>> = {
  GO: [{ code: 5201405, name: 'Caiapônia' }, { code: 5218805, name: 'Rio Verde' }],
  MG: [{ code: 3137601, name: 'Lagoa da Prata' }],
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
});

beforeEach(() => {
  listMunicipalitiesAction.mockReset();
  listMunicipalitiesAction.mockImplementation(async (uf: string) => ({ ok: true, data: LISTS[uf] }));
});

const hidden = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[name="cityCode"]')!;

describe('CityPicker', () => {
  it('começa com GO e Caiapônia', async () => {
    const { container } = render(<CityPicker states={STATES} defaultUf="GO" defaultCity={{ code: 5201405, name: 'Caiapônia' }} />);
    expect(screen.getByLabelText('UF')).toHaveValue('GO');
    expect(screen.getByLabelText('Cidade')).toHaveValue('Caiapônia');
    expect(hidden(container).value).toBe('5201405');
  });

  it('trocar a UF limpa a cidade e carrega os municípios da nova UF', async () => {
    const user = userEvent.setup();
    const { container } = render(<CityPicker states={STATES} defaultUf="GO" defaultCity={{ code: 5201405, name: 'Caiapônia' }} />);
    await user.selectOptions(screen.getByLabelText('UF'), 'MG');
    expect(screen.getByLabelText('Cidade')).toHaveValue('');
    expect(hidden(container).value).toBe('');
    await waitFor(() => expect(listMunicipalitiesAction).toHaveBeenCalledWith('MG'));
    await waitFor(() => expect(container.querySelectorAll('datalist option')).toHaveLength(1));
  });

  it('resolve o código sem diferenciar acento e caixa', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { container } = render(<CityPicker states={STATES} defaultUf="GO" defaultCity={{ code: 5201405, name: 'Caiapônia' }} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('UF'), 'MG');
    await waitFor(() => expect(container.querySelectorAll('datalist option')).toHaveLength(1));
    await user.type(screen.getByLabelText('Cidade'), 'lagoa da prata');
    expect(hidden(container).value).toBe('3137601');
    expect(onChange).toHaveBeenLastCalledWith({ uf: 'MG', cityCode: 3137601, cityName: 'lagoa da prata' });
  });

  it('texto fora da lista deixa o código nulo', async () => {
    const user = userEvent.setup();
    const { container } = render(<CityPicker states={STATES} defaultUf="GO" defaultCity={{ code: 5201405, name: 'Caiapônia' }} />);
    const city = screen.getByLabelText('Cidade');
    await user.clear(city);
    await user.type(city, 'Lagoa');
    expect(hidden(container).value).toBe('');
  });

  it('mostra o erro e a dica', () => {
    render(<CityPicker states={STATES} defaultUf="GO" error="Escolha uma cidade da lista." />);
    expect(screen.getByText('Escolha uma cidade da lista.')).toBeInTheDocument();
  });

  it('informa carregamento enquanto a lista da UF não chega e resolve o código depois', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onLoadingChange = vi.fn();
    let resolveList!: (value: unknown) => void;
    listMunicipalitiesAction.mockImplementation((uf: string) =>
      uf === 'MG' ? new Promise((resolve) => { resolveList = resolve; }) : Promise.resolve({ ok: true, data: LISTS[uf] }),
    );
    const { container } = render(
      <CityPicker states={STATES} defaultUf="GO" defaultCity={{ code: 5201405, name: 'Caiapônia' }} onChange={onChange} onLoadingChange={onLoadingChange} />,
    );
    await waitFor(() => expect(onLoadingChange).toHaveBeenLastCalledWith(false));
    await user.selectOptions(screen.getByLabelText('UF'), 'MG');
    await user.type(screen.getByLabelText('Cidade'), 'lagoa da prata');
    expect(onLoadingChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByText('Carregando cidades…')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({ uf: 'MG', cityCode: null, cityName: 'lagoa da prata' });
    resolveList({ ok: true, data: LISTS.MG });
    await waitFor(() => expect(onLoadingChange).toHaveBeenLastCalledWith(false));
    expect(onChange).toHaveBeenLastCalledWith({ uf: 'MG', cityCode: 3137601, cityName: 'lagoa da prata' });
    expect(hidden(container).value).toBe('3137601');
  });

  it('sem allowUnknown não há checkbox', () => {
    render(<CityPicker states={STATES} defaultUf="GO" />);
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('com allowUnknown e unknown os campos ficam desabilitados e o código vazio', async () => {
    const onChange = vi.fn();
    const onLoadingChange = vi.fn();
    const { container } = render(
      <CityPicker states={STATES} defaultUf="GO" defaultCity={{ code: 5201405, name: 'Caiapônia' }} allowUnknown unknown onUnknownChange={vi.fn()} onChange={onChange} onLoadingChange={onLoadingChange} />,
    );
    expect(screen.getByLabelText('Não informado')).toBeChecked();
    expect(screen.getByLabelText('UF')).toBeDisabled();
    expect(screen.getByLabelText('Cidade')).toBeDisabled();
    expect(screen.getByLabelText('Cidade')).toHaveValue('Não informado');
    expect(hidden(container).value).toBe('');
    await waitFor(() => expect(onLoadingChange).toHaveBeenLastCalledWith(false));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('o checkbox avisa onUnknownChange', async () => {
    const user = userEvent.setup();
    const onUnknownChange = vi.fn();
    render(<CityPicker states={STATES} defaultUf="GO" allowUnknown unknown={false} onUnknownChange={onUnknownChange} />);
    await user.click(screen.getByLabelText('Não informado'));
    expect(onUnknownChange).toHaveBeenCalledWith(true);
  });
});
