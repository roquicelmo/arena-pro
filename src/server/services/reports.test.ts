import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../prisma', () => ({ prisma: {} }));

import { reportEventWhere } from './reports';

describe('reportEventWhere', () => {
  it('User ignora o dono pedido e usa o próprio id', () => {
    expect(reportEventWhere({ id: 'u1', role: 'USER' }, { ownerId: 'u2' })).toEqual({ createdById: 'u1' });
  });
  it('gerente filtra por dono, status válido e período em UTC', () => {
    expect(reportEventWhere({ id: 'm1', role: 'MANAGER' }, { ownerId: 'u2', status: 'FINISHED', from: '2026-12-01', to: '2026-12-31' })).toEqual({
      createdById: 'u2',
      status: 'FINISHED',
      eventDate: { gte: new Date('2026-12-01T00:00:00.000Z'), lte: new Date('2026-12-31T23:59:59.999Z') },
    });
  });
  it('status e datas inválidos são ignorados', () => {
    expect(reportEventWhere({ id: 'm1', role: 'ADMIN' }, { status: 'X', from: '01/12/2026' })).toEqual({});
  });
});
