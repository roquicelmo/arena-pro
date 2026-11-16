import { describe, expect, it } from 'vitest';
import { MANAGER_ROLES, OPERATOR_ROLES, canAccessOwnerData, isManager } from './permissions';

describe('permissions', () => {
  it('trata o papel legado ORGANIZER como manager', () => {
    expect(isManager('ORGANIZER')).toBe(true);
    expect(MANAGER_ROLES).toContain('ORGANIZER');
  });

  it('não inclui VIEWER entre os papéis operacionais', () => {
    expect(OPERATOR_ROLES).not.toContain('VIEWER');
    expect(OPERATOR_ROLES).toContain('USER');
  });

  it('user só acessa dados próprios; manager acessa todos', () => {
    expect(canAccessOwnerData('USER', 'u1', 'u2')).toBe(false);
    expect(canAccessOwnerData('USER', 'u1', 'u1')).toBe(true);
    expect(canAccessOwnerData('MANAGER', 'u1', 'u2')).toBe(true);
  });
});
