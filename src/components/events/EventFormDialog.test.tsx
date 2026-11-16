// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EventSummary } from '../../types/events';
import { EventFormDialog } from './EventFormDialog';

const actions = vi.hoisted(() => ({ createEventAction: vi.fn(), updateEventAction: vi.fn() }));
vi.mock('../../server/actions/events', () => actions);
const { listMunicipalitiesAction } = vi.hoisted(() => ({ listMunicipalitiesAction: vi.fn() }));
vi.mock('../../server/actions/arenas', () => ({ listMunicipalitiesAction }));
const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../ui/Toaster', () => ({ toast, Toaster: () => null }));

const STATES = [{ uf: 'GO', name: 'Goiás' }, { uf: 'MG', name: 'Minas Gerais' }];
const DEFAULT_CITY = { code: 5201405, name: 'Caiapônia', uf: 'GO' };
const ARENAS = [{ id: 'ar1', name: 'ARENA UM', city: 'Arcos', state: 'MG', cityCode: 3105400 }];
const EVENT: EventSummary = {
  id: 'ev1', name: 'COPA VELHA', date: '20/12/2026', isoDate: '2026-12-20', format: 'x', arena: 'ARENA UM', status: 'ABERTA', runs: 0,
};

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  listMunicipalitiesAction.mockResolvedValue({ ok: true, data: [{ code: 5201405, name: 'Caiapônia' }] });
});

function setup(props: Partial<React.ComponentProps<typeof EventFormDialog>> = {}) {
  const onClose = vi.fn();
  render(<EventFormDialog open onClose={onClose} arenas={ARENAS} states={STATES} defaultCity={DEFAULT_CITY} {...props} />);
  return { onClose, user: userEvent.setup() };
}

describe('EventFormDialog', () => {
  it('com arena existente esconde os campos de nova arena', async () => {
    const { user } = setup();
    expect(screen.getByLabelText('Nome da nova arena')).toBeInTheDocument();
    expect(screen.getByLabelText('Cidade')).toHaveValue('Caiapônia');
    await user.selectOptions(screen.getByLabelText('Arena'), 'ar1');
    expect(screen.queryByLabelText('Nome da nova arena')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cidade')).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'ARENA UM · Arcos/MG' })).toBeInTheDocument();
  });

  it('erro do servidor aparece só no formulário', async () => {
    const message = 'Arena não encontrada ou inativa.';
    actions.createEventAction.mockResolvedValue({ ok: false, message, fieldErrors: { arenaId: [message] } });
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Nome da prova'), 'COPA NOVA');
    await user.type(screen.getByLabelText('Data'), '2026-12-20');
    await user.selectOptions(screen.getByLabelText('Arena'), 'ar1');
    await user.click(screen.getByRole('button', { name: 'Salvar prova' }));
    await waitFor(() => expect(screen.getByText(message)).toBeInTheDocument());
    expect(toast.error).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome da prova')).toHaveValue('COPA NOVA');
    expect(screen.getByLabelText('Data')).toHaveValue('2026-12-20');
  });

  it('edição mostra a arena como texto e envia só nome e data', async () => {
    actions.updateEventAction.mockResolvedValue({ ok: true, data: EVENT });
    const { user, onClose } = setup({ event: EVENT });
    expect(screen.getByRole('dialog', { name: 'Editar prova' })).toBeInTheDocument();
    expect(screen.getByText('Arena: ARENA UM')).toBeInTheDocument();
    expect(screen.queryByLabelText('Arena')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-12-20');
    await user.clear(screen.getByLabelText('Nome da prova'));
    await user.type(screen.getByLabelText('Nome da prova'), 'COPA NOVA');
    await user.click(screen.getByRole('button', { name: 'Salvar prova' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(actions.updateEventAction).toHaveBeenCalledWith('ev1', { name: 'COPA NOVA', eventDate: '2026-12-20' });
    expect(toast.success).toHaveBeenCalledWith('Prova atualizada.');
  });
});
