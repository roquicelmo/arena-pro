import { describe, expect, it } from 'vitest';
import { isActivePath, navItemsFor, roleLabel } from './navItems';

describe('navItemsFor', () => {
  it('esconde Usuários de quem não é gestor', () => {
    expect(navItemsFor('USER').map((i) => i.href)).not.toContain('/usuarios');
  });
  it('mostra Usuários para papéis de gestão', () => {
    expect(navItemsFor('ORGANIZER').map((i) => i.href)).toContain('/usuarios');
    expect(navItemsFor('MANAGER').map((i) => i.href)).toContain('/usuarios');
    expect(navItemsFor('ADMIN').map((i) => i.href)).toContain('/usuarios');
  });
  it('Cadastros vem logo depois de Usuários e só para gestores', () => {
    const hrefs = navItemsFor('MANAGER').map((i) => i.href);
    expect(hrefs.indexOf('/cadastros')).toBe(hrefs.indexOf('/usuarios') + 1);
    expect(navItemsFor('USER').map((i) => i.href)).not.toContain('/cadastros');
  });
  it('começa pelo Painel e mantém a ordem', () => {
    expect(navItemsFor('ADMIN')[0]).toMatchObject({ href: '/', label: 'Painel' });
    expect(navItemsFor('ADMIN').map((i) => i.href)).toEqual([
      '/', '/provas', '/atletas', '/agenda', '/sorteio-avulso', '/usuarios', '/cadastros', '/relatorios',
    ]);
  });
});

describe('isActivePath', () => {
  it('raiz só é ativa na raiz', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/provas', '/')).toBe(false);
  });
  it('subrotas ativam o item pai', () => {
    expect(isActivePath('/provas/abc', '/provas')).toBe(true);
    expect(isActivePath('/provas', '/provas')).toBe(true);
    expect(isActivePath('/provasx', '/provas')).toBe(false);
  });
});

describe('roleLabel', () => {
  it('traduz papéis', () => {
    expect(roleLabel('ADMIN')).toBe('Administrador');
    expect(roleLabel('MANAGER')).toBe('Gestor');
    expect(roleLabel('ORGANIZER')).toBe('Gestor');
    expect(roleLabel('USER')).toBe('Usuário');
    expect(roleLabel('VIEWER')).toBe('VIEWER');
  });
});
