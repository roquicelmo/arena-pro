// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Competitor } from '../../types/roping';
import { AthleteFormDialog } from './AthleteFormDialog';

const actions = vi.hoisted(() => ({
  createAthleteAction: vi.fn(),
  updateAthleteAction: vi.fn(),
  checkAthleteDuplicatesAction: vi.fn(),
}));
vi.mock('../../server/actions/athletes', () => actions);
const { listMunicipalitiesAction } = vi.hoisted(() => ({ listMunicipalitiesAction: vi.fn() }));
vi.mock('../../server/actions/arenas', () => ({ listMunicipalitiesAction }));
const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../ui/Toaster', () => ({ toast, Toaster: () => null }));

const STATES = [{ uf: 'GO', name: 'Goiás' }, { uf: 'MG', name: 'Minas Gerais' }];
const DEFAULT_CITY = { code: 5201405, name: 'Caiapônia', uf: 'GO' };
const SAVED: Competitor = { id: 'a1', nome: 'Zé', handicap: 2.5 };

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
});

beforeEach(() => {
  Object.values(actions).forEach((fn) => fn.mockReset());
  toast.success.mockReset();
  toast.error.mockReset();
  listMunicipalitiesAction.mockResolvedValue({ ok: true, data: [{ code: 5201405, name: 'Caiapônia' }] });
  actions.checkAthleteDuplicatesAction.mockResolvedValue({ ok: true, data: [] });
});

function setup(props: Partial<React.ComponentProps<typeof AthleteFormDialog>> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const onUseExisting = vi.fn();
  render(
    <AthleteFormDialog open onClose={onClose} states={STATES} defaultCity={DEFAULT_CITY} onSaved={onSaved} onUseExisting={onUseExisting} {...props} />,
  );
  return { onClose, onSaved, onUseExisting, user: userEvent.setup() };
}

describe('AthleteFormDialog', () => {
  it('falha mantém os dados e mostra o erro do campo, sem toast', async () => {
    actions.createAthleteAction.mockResolvedValue({
      ok: false, message: 'Revise os campos destacados.', fieldErrors: { name: ['Informe o nome com pelo menos 2 letras.'] },
    });
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Z');
    await user.click(screen.getByRole('button', { name: 'Salvar atleta' }));
    const name = screen.getByLabelText('Nome');
    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    expect(name).toHaveValue('Z');
    expect(screen.getByText('Informe o nome com pelo menos 2 letras.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Novo atleta' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('sucesso chama onSaved e onClose', async () => {
    actions.createAthleteAction.mockResolvedValue({ ok: true, data: SAVED });
    const { user, onSaved, onClose } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Zé Lima');
    await user.click(screen.getByRole('button', { name: 'Salvar atleta' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(SAVED));
    expect(onClose).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Atleta cadastrado.');
    expect(actions.createAthleteAction).toHaveBeenCalledWith(expect.objectContaining({ name: 'Zé Lima', cityCode: 5201405, headHandicap: '2.5' }));
  });

  it('edição abre preenchida com os dados do atleta', () => {
    setup({
      athlete: { id: 'a1', nome: 'Zé Lima', apelido: 'Zeca', clube: 'Haras', handicap: 3, headHandicap: 3, heelHandicap: 4, cidade: 'Caiapônia', estado: 'GO', cityCode: 5201405 },
    });
    expect(screen.getByRole('dialog', { name: 'Editar atleta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Zé Lima');
    expect(screen.getByLabelText('Apelido')).toHaveValue('Zeca');
    expect(screen.getByLabelText('Clube')).toHaveValue('Haras');
    expect(screen.getByLabelText('Handicap de cabeceiro')).toHaveValue('3');
    expect(screen.getByLabelText('Handicap de pezeiro')).toHaveValue('4');
    expect(screen.getByLabelText('Cidade')).toHaveValue('Caiapônia');
  });

  it('cidade a revisar começa vazia com a dica', () => {
    setup({ athlete: { id: 'a1', nome: 'Zé', handicap: 3, cidade: 'Lagoa Velha', cityNeedsReview: true } });
    expect(screen.getByLabelText('Cidade')).toHaveValue('');
    expect(screen.getByText('Cidade anterior: Lagoa Velha')).toBeInTheDocument();
  });

  it('duplicado mostra o aviso e "Cadastrar mesmo assim" cria', async () => {
    actions.checkAthleteDuplicatesAction.mockResolvedValue({
      ok: true, data: [{ id: 'x1', name: 'Zé Lima', city: 'Caiapônia', state: 'GO', club: 'Haras', ownerName: null }],
    });
    actions.createAthleteAction.mockResolvedValue({ ok: true, data: SAVED });
    const { user } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Zé Lima');
    await user.click(screen.getByRole('button', { name: 'Salvar atleta' }));
    expect(await screen.findByText('Possível atleta já cadastrado')).toBeInTheDocument();
    expect(screen.getByText('Zé Lima · Caiapônia/GO · Haras')).toBeInTheDocument();
    expect(actions.createAthleteAction).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cadastrar mesmo assim' }));
    await waitFor(() => expect(actions.createAthleteAction).toHaveBeenCalledTimes(1));
  });

  it('"Usar o existente" chama onUseExisting com o id e fecha', async () => {
    actions.checkAthleteDuplicatesAction.mockResolvedValue({
      ok: true, data: [{ id: 'x1', name: 'Zé Lima', city: 'Caiapônia', state: 'GO', club: null, ownerName: null }],
    });
    const { user, onUseExisting, onClose } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Zé Lima');
    await user.click(screen.getByRole('button', { name: 'Salvar atleta' }));
    await user.click(await screen.findByRole('button', { name: 'Usar o existente' }));
    expect(onUseExisting).toHaveBeenCalledWith('x1');
    expect(onClose).toHaveBeenCalled();
    expect(actions.createAthleteAction).not.toHaveBeenCalled();
  });

  it('se a verificação de duplicados falhar, o cadastro segue', async () => {
    actions.checkAthleteDuplicatesAction.mockRejectedValue(new Error('x'));
    actions.createAthleteAction.mockResolvedValue({ ok: true, data: SAVED });
    const { user, onSaved } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Zé Lima');
    await user.click(screen.getByRole('button', { name: 'Salvar atleta' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('com o salvamento pendente, Esc não fecha o diálogo', async () => {
    let resolve!: (value: unknown) => void;
    actions.createAthleteAction.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Zé Lima');
    await user.click(screen.getByRole('button', { name: 'Salvar atleta' }));
    await waitFor(() => expect(actions.createAthleteAction).toHaveBeenCalled());
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    resolve({ ok: false, message: 'Erro.' });
    expect(await screen.findByText('Erro.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Zé Lima');
  });
});
