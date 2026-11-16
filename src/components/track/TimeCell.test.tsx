// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeCell } from './TimeCell';

const setup = (value = '8.1') => {
  const onChange = vi.fn();
  const onNt = vi.fn();
  render(
    <>
      <TimeCell runNumber={1} bull={1} value={value} nt={false} onChange={onChange} onNt={onNt} />
      <TimeCell runNumber={1} bull={2} value="" nt={false} onChange={vi.fn()} onNt={vi.fn()} />
    </>,
  );
  return { onChange, onNt, user: userEvent.setup() };
};

describe('TimeCell', () => {
  it('Enter foca o próximo campo de tempo', async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText('Tempo boi 1 da corrida 1'));
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Tempo boi 2 da corrida 1')).toHaveFocus();
  });

  it('n marca NT sem digitar a letra', async () => {
    const { user, onNt, onChange } = setup();
    await user.click(screen.getByLabelText('Tempo boi 1 da corrida 1'));
    await user.keyboard('n');
    expect(onNt).toHaveBeenCalledWith(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Esc devolve o valor que havia ao focar', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<TimeCell runNumber={2} bull={1} value="8.1" nt={false} onChange={onChange} onNt={vi.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Tempo boi 1 da corrida 2'));
    rerender(<TimeCell runNumber={2} bull={1} value="9.9" nt={false} onChange={onChange} onNt={vi.fn()} />);
    await user.keyboard('{Escape}');
    expect(onChange).toHaveBeenLastCalledWith('8.1');
  });
});
