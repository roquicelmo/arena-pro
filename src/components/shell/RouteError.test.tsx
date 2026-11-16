// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { RouteError } from './RouteError';

describe('RouteError', () => {
  it('tentar novamente refaz a busca de dados e reseta o limite de erro', async () => {
    const reset = vi.fn();
    const error = new Error('boom');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RouteError error={error} reset={reset} />);
    expect(spy).toHaveBeenCalledWith(error);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
