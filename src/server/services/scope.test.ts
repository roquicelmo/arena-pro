import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { accessScope, eventScope, ownerScope } from './scope';

describe('ownerScope / eventScope', () => {
  it('USER sempre vê só os próprios registros', () => {
    expect(ownerScope({ id: 'u1', role: 'USER' }, 'u2')).toEqual({ ownerId: 'u1' });
    expect(eventScope({ id: 'u1', role: 'USER' })).toEqual({ createdById: 'u1' });
  });

  it('gerentes filtram só quando pedem', () => {
    expect(ownerScope({ id: 'm1', role: 'MANAGER' })).toEqual({});
    expect(ownerScope({ id: 'm1', role: 'ORGANIZER' }, 'u2')).toEqual({ ownerId: 'u2' });
    expect(ownerScope({ id: 'a1', role: 'ADMIN' }, 'u2')).toEqual({ ownerId: 'u2' });
    expect(eventScope({ id: 'a1', role: 'ADMIN' }, 'u2')).toEqual({ createdById: 'u2' });
  });

  it('outros papéis seguem a regra de USER', () => {
    expect(ownerScope({ id: 'v1', role: 'VIEWER' }, 'u2')).toEqual({ ownerId: 'v1' });
  });
});

describe('accessScope', () => {
  const shared = (id: string) => ({ OR: [{ ownerId: id }, { shares: { some: { userId: id } } }] });

  it('USER vê os próprios e os compartilhados, ignorando o filtro', () => {
    expect(accessScope({ id: 'u1', role: 'USER' }, 'u2')).toEqual(shared('u1'));
  });

  it('gerente com filtro vê os do dono filtrado e os compartilhados com ele', () => {
    expect(accessScope({ id: 'm1', role: 'MANAGER' }, 'u2')).toEqual(shared('u2'));
  });

  it('admin sem filtro vê tudo', () => {
    expect(accessScope({ id: 'a1', role: 'ADMIN' })).toEqual({});
  });

  it('outros papéis seguem a regra de USER', () => {
    expect(accessScope({ id: 'v1', role: 'VIEWER' })).toEqual(shared('v1'));
  });
});
