import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { eventScope, ownerScope } from './scope';

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
