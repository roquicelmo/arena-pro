// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Dialog } from './Dialog';

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

function Harness({ busy = false, onClose }: { busy?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir</button>
      <Dialog
        open={open}
        busy={busy}
        title="Novo atleta"
        description="Preencha os dados."
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
      >
        <input aria-label="Nome" />
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('abre com o título acessível', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog', { name: 'Novo atleta' })).toBeInTheDocument();
    expect(screen.getByText('Preencha os dados.')).toBeInTheDocument();
  });

  it('Esc chama onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('botão Fechar chama onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('com busy, Esc e Fechar não chamam onClose', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<Harness busy onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ao fechar, o foco volta ao botão que abriu', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Abrir' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(document.activeElement).toBe(trigger);
  });
});
