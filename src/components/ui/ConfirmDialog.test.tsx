// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ConfirmProvider, useConfirm } from './ConfirmDialog';

beforeAll(() => {
  // jsdom não implementa <dialog>.showModal/close.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(returnValue?: string) {
    this.removeAttribute('open');
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
});

function Harness({ confirmLabel }: { confirmLabel?: string }) {
  const confirm = useConfirm();
  const [result, setResult] = useState('pendente');
  return (
    <>
      <button
        type="button"
        onClick={async () => setResult(String(await confirm({ title: 'Cancelar a prova?', confirmLabel, tone: 'danger' })))}
      >
        Abrir
      </button>
      <output>{result}</output>
    </>
  );
}

const setup = (confirmLabel?: string) => {
  const user = userEvent.setup();
  render(
    <ConfirmProvider>
      <Harness confirmLabel={confirmLabel} />
    </ConfirmProvider>,
  );
  return user;
};

describe('ConfirmDialog', () => {
  it('resolve true ao confirmar', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('true')).toBeInTheDocument();
  });

  it('resolve false ao cancelar', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('false')).toBeInTheDocument();
  });

  it('resolve false com Esc', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.keyboard('{Escape}');
    expect(await screen.findByText('false')).toBeInTheDocument();
  });

  it('devolve o foco ao gatilho ao fechar', async () => {
    const user = setup();
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await screen.findByText('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('usa os rótulos informados', async () => {
    const user = setup('Cancelar prova');
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('button', { name: 'Cancelar prova' })).toBeInTheDocument();
    expect(screen.getByText('Cancelar a prova?')).toBeInTheDocument();
  });
});
