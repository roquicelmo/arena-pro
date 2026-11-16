import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalDatabaseUrl } from './assert-local-db.mjs';

test('aceita localhost e 127.0.0.1', () => {
  assertLocalDatabaseUrl('postgresql://postgres:postgres@localhost:54329/sorteios_lagoa_dev');
  assertLocalDatabaseUrl('postgres://postgres:postgres@127.0.0.1:54329/sorteios_lagoa_test');
});

test('recusa host remoto', () => {
  assert.throws(
    () => assertLocalDatabaseUrl('postgres://u:p@db.prisma.io:5432/postgres?sslmode=require'),
    /não é local/,
  );
});

test('recusa url ausente', () => {
  assert.throws(() => assertLocalDatabaseUrl(undefined), /DATABASE_URL/);
});

test('recusa host que só começa com localhost', () => {
  assert.throws(() => assertLocalDatabaseUrl('postgres://u:p@localhost.evil.com:5432/x'), /não é local/);
});

test('recusa url malformada', () => {
  assert.throws(() => assertLocalDatabaseUrl('isso não é uma url'), /não é local/);
});
