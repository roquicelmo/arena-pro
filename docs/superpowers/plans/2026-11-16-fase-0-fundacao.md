# Fase 0 — Fundação: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o projeto pronto para a refatoração: banco local isolado da produção, Vitest e Playwright funcionando, helpers de sessão no servidor, identidade visual Arena (tokens, fontes) aplicada globalmente e primitivas de UI prontas para as próximas fases.

**Architecture:** O Postgres local roda em Docker, com um banco de desenvolvimento e outro de testes, e uma trava impede que os scripts locais apontem para outro host. O Vitest cobre a lógica de servidor e as primitivas de UI. O Playwright sobe o `next dev` contra o banco de testes. Os tokens CSS legados passam a ter os valores Arena, então a UI antiga já adota a paleta sem ser reescrita, e as primitivas novas usam os tokens via `@theme` do Tailwind 4.

**Tech Stack:** Next.js 16.4.6, React 19.2, TypeScript 6, Prisma 6.19 + PostgreSQL 16 (Docker), Tailwind 4.3, Vitest + Testing Library (jsdom), Playwright, `sonner` (toasts), `next/font/google` (Barlow, Barlow Condensed).

**Spec:** [docs/superpowers/specs/2026-11-16-refatoracao-ux-arquitetura-design.md](../specs/2026-11-16-refatoracao-ux-arquitetura-design.md) — seções 3, 5, 6.2, 8 e 9 (fase 0).

> Este é o plano da **fase 0**. As fases 1 a 5 da spec terão um plano próprio cada, escrito quando a fase anterior terminar, porque dependem das interfaces criadas aqui.

## Global Constraints

- Nunca usar `.env.production.local` nem qualquer URL que não seja `localhost`/`127.0.0.1` em dev, seed local ou testes.
- Schema Prisma intocado nesta fase (sem migrations novas).
- A aplicação atual deve continuar funcionando (login, painel, navegação) ao fim de cada task.
- Textos de interface em pt-BR.
- Paleta Arena (valores de partida): areia `#f7f3ec`, superfície `#fffdf9`, navegação `#efe7da`, linha `#e2d6c3`, linha suave `#efe7da`, tinta forte `#2a1f16`, tinta `#3a2f25`, tinta suave `#8a7a68` (ajustar para AA se necessário), terracota `#b5471b`, destaque da corrida atual `#f3e3cf`.
- Fontes: `Barlow` (400/500/600) para texto e `Barlow Condensed` (600/700) para títulos em caixa alta e números.
- Tema claro apenas; raios de 4px; sem sombras pesadas.
- Credenciais de teste só em arquivos do projeto (fixture/seed); nunca reutilizar a senha real do admin.
- `npm run build` e `npm run lint` verdes ao fim da fase.

## Review Focus

1. **Script local apontado para um banco remoto** (por exemplo, alguém exporta a `DATABASE_URL` de produção no shell) → os scripts `db:local:*`, `db:test:*` e o seed de e2e devem recusar e encerrar com erro claro. Teste na Task 1.
2. **Usuário bloqueado ou expirado ainda com cookie válido** → `auth.ts` devolve o papel `VIEWER`. `requireRole` com os papéis operacionais tem de recusar `VIEWER`. Teste na Task 3.
3. **Papel legado `ORGANIZER`** → deve ser tratado como Manager pelos helpers novos, igual a `permissions.ts`. Teste na Task 3.
4. **Celular de 375px** → login e painel sem scroll horizontal. Teste Playwright na Task 4, que também passa a valer depois da Task 5.
5. **Diálogo de confirmação fechado com Esc ou clique fora** → equivale a "Cancelar" (resolve `false`) e o foco volta ao botão que abriu o diálogo. Teste na Task 6.

---

### Task 1: Postgres local com trava contra bancos remotos

**Files:**
- Create: `docker-compose.yml`
- Create: `scripts/assert-local-db.mjs`
- Create: `scripts/assert-local-db.test.mjs` (executado pelo Vitest da Task 3; nesta task roda com `node --test`)
- Create: `.env.local.example`
- Modify: `.gitignore` (adicionar `!.env.local.example`)
- Modify: `package.json` (scripts + devDependency `dotenv-cli`)

**Interfaces:**
- Produces: `assertLocalDatabaseUrl(url: string | undefined): void`, que lança `Error` quando a URL não for `postgres(ql)://…@localhost|127.0.0.1:…`. Também roda como CLI: `node scripts/assert-local-db.mjs` lê `process.env.DATABASE_URL` e sai com código 1 se a URL não for local.
- Produces: bancos `sorteios_lagoa_dev` e `sorteios_lagoa_test` no container `sorteios-lagoa-db`, porta do host **54329**, usuário e senha `postgres`/`postgres`.
- Produces: scripts npm `db:local:up`, `db:local:migrate`, `db:local:seed`, `db:test:reset`.

- [ ] **Step 1: Escrever o teste que falha** (`node:test`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertLocalDatabaseUrl } from './assert-local-db.mjs';

test('aceita localhost e 127.0.0.1', () => {
  assertLocalDatabaseUrl('postgresql://postgres:postgres@localhost:54329/sorteios_lagoa_dev');
  assertLocalDatabaseUrl('postgres://postgres:postgres@127.0.0.1:54329/sorteios_lagoa_test');
});
test('recusa host remoto', () => {
  assert.throws(() => assertLocalDatabaseUrl('postgres://u:p@db.prisma.io:5432/postgres?sslmode=require'), /não é local/);
});
test('recusa url ausente', () => {
  assert.throws(() => assertLocalDatabaseUrl(undefined), /DATABASE_URL/);
});
test('recusa host que só começa com localhost', () => {
  assert.throws(() => assertLocalDatabaseUrl('postgres://u:p@localhost.evil.com:5432/x'), /não é local/);
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `node --test scripts/assert-local-db.test.mjs`
Expected: FAIL (módulo não encontrado)

- [ ] **Step 3: Implementar `assertLocalDatabaseUrl` em `scripts/assert-local-db.mjs`**

Usar `new URL(url).hostname` e comparar exatamente com `localhost` ou `127.0.0.1`. O bloco CLI roda quando `import.meta.url === pathToFileURL(process.argv[1]).href` e imprime `Recusado: DATABASE_URL não é local.` antes de sair com código 1.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `node --test scripts/assert-local-db.test.mjs`
Expected: 4 testes passando

- [ ] **Step 5: Criar `docker-compose.yml`, `.env.local.example` e os scripts**

- `docker-compose.yml`: serviço `db` com `postgres:16-alpine`, `container_name: sorteios-lagoa-db`, porta `54329:5432`, `POSTGRES_USER`/`POSTGRES_PASSWORD`=`postgres`, `POSTGRES_DB=sorteios_lagoa_dev`, volume nomeado e healthcheck `pg_isready`. Um arquivo montado em `/docker-entrypoint-initdb.d/` cria também o banco `sorteios_lagoa_test`.
- `.env.local.example`: `DATABASE_URL` e `DATABASE_URL_POOLED` apontando para `sorteios_lagoa_dev` em `localhost:54329`, `DATABASE_URL_TEST` apontando para `sorteios_lagoa_test`, `AUTH_SECRET` (gerar com `openssl rand -base64 32`), `SEED_ADMIN_EMAIL=admin@sorteios.test`, `SEED_ADMIN_PASSWORD=admin-local-123`, chaves do reCAPTCHA vazias.
- Scripts em `package.json`. Cada script `db:*` roda a trava antes do Prisma, carregando `.env.local` com `dotenv -e .env.local --`:
  - `db:local:up` = `docker compose up -d --wait`
  - `db:local:migrate` = trava + `prisma migrate deploy`
  - `db:local:seed` = trava + `prisma db seed`
  - `db:test:reset` = igual, mas sobrescreve `DATABASE_URL`/`DATABASE_URL_POOLED` com `DATABASE_URL_TEST` (`dotenv -e .env.local -v DATABASE_URL=… -v DATABASE_URL_POOLED=…`, ou um script `scripts/with-test-db.mjs`, à escolha do implementador) e roda trava + `prisma migrate reset --force --skip-seed` + `tsx prisma/seed-e2e.ts` (Task 2).

- [ ] **Step 6: Verificar o fluxo completo**

Run: `cp .env.local.example .env.local && npm run db:local:up && npm run db:local:migrate && npm run db:local:seed`
Expected: as 3 migrations aplicadas e o seed concluído sem erro.

Run: `DATABASE_URL='postgres://u:p@db.prisma.io:5432/x' node scripts/assert-local-db.mjs; echo $?`
Expected: `Recusado: DATABASE_URL não é local.` e `1`

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml scripts/ .env.local.example .gitignore package.json package-lock.json
git commit -m "chore: postgres local em docker com trava contra banco remoto"
```

---

### Task 2: Seed de e2e com usuários por papel

**Files:**
- Create: `prisma/seed-e2e.ts`
- Create: `e2e/fixtures/users.ts`

**Interfaces:**
- Consumes: `assertLocalDatabaseUrl` (Task 1), schema Prisma atual.
- Produces: `TEST_USERS` em `e2e/fixtures/users.ts`:

```ts
export const TEST_USERS = {
  admin:   { email: 'admin@sorteios.test',   password: 'admin-local-123',   role: 'ADMIN' },
  manager: { email: 'manager@sorteios.test', password: 'manager-local-123', role: 'MANAGER' },
  userA:   { email: 'user.a@sorteios.test',  password: 'usera-local-123',   role: 'USER' },
  userB:   { email: 'user.b@sorteios.test',  password: 'userb-local-123',   role: 'USER' },
} as const;
```

- Produces: dados do banco de testes:
  - 1 arena por usuário.
  - `userA` é dono de 6 atletas (3 cabeceiros e 3 pezeiros, com handicaps entre 1 e 3,5) e de 1 prova `PROVA E2E USER A` (status `OPEN`) com as 6 inscrições `ACTIVE` (`category` `CABECEIRO`/`PEZEIRO`).
  - `userB` é dono de 2 atletas e de 1 prova `PROVA E2E USER B`.
  - Nenhum sorteio é criado.

- [ ] **Step 1: Implementar `prisma/seed-e2e.ts`**

A primeira linha executável chama `assertLocalDatabaseUrl(process.env.DATABASE_URL)`. O seed importa `TEST_USERS`, usa `bcryptjs.hash(password, 12)` e `upsert` por e-mail, com `active: true` e `provisional: false`. Os nomes de atletas e provas acima são fixos, porque os testes da fase 1 em diante os procuram por texto.

- [ ] **Step 2: Verificar**

Run: `npm run db:test:reset`
Expected: o reset termina sem erro. Depois, `docker exec sorteios-lagoa-db psql -U postgres -d sorteios_lagoa_test -c 'select email, role from "User" order by email'` lista os 4 usuários.

- [ ] **Step 3: Verificar a trava**

Run: `DATABASE_URL='postgres://u:p@db.prisma.io:5432/x' npx tsx prisma/seed-e2e.ts; echo $?`
Expected: `Recusado…` e código diferente de zero, sem nenhuma conexão aberta.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed-e2e.ts e2e/fixtures/users.ts package.json
git commit -m "test: seed de e2e com usuários admin, manager e dois users"
```

---

### Task 3: Vitest e helpers de sessão no servidor

**Files:**
- Create: `vitest.config.ts`
- Create: `src/server/session.ts`
- Create: `src/server/session.test.ts`
- Modify: `src/server/permissions.ts` (constantes de papel)
- Create: `src/server/permissions.test.ts`
- Modify: `package.json` (`test`, `test:watch`; devDependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`)

**Interfaces:**
- Consumes: `getAuthenticatedUser(headers: Headers): Promise<AuthenticatedUser | null>` de `src/server/auth.ts` (existente).
- Produces, em `src/server/permissions.ts`:
  - `export const MANAGER_ROLES = ['ADMIN', 'MANAGER', 'ORGANIZER'] as const;`
  - `export const OPERATOR_ROLES = ['ADMIN', 'MANAGER', 'ORGANIZER', 'USER'] as const;`
  - Os helpers existentes ficam com a mesma assinatura.
- Produces, em `src/server/session.ts` (com `import 'server-only'`):
  - `getCurrentUser(): Promise<AuthenticatedUser | null>`: lê `headers()` de `next/headers` e chama `getAuthenticatedUser`. Usar `cache()` do React para deduplicar a leitura dentro da mesma requisição.
  - `requireUser(): Promise<AuthenticatedUser>`: sem sessão, chama `redirect('/login')`. Até a fase 1 a rota `/login` ainda não existe e o redirect cai na página atual, o que é aceitável.
  - `requireRole(roles: readonly string[]): Promise<AuthenticatedUser>`: chama `requireUser` e, se o papel não estiver em `roles`, chama `forbidden()` ou `notFound()` de `next/navigation`. Preferir `forbidden()` se `experimental.authInterrupts` funcionar no Next 16.4; senão usar `notFound()`. Registrar a escolha num comentário.
  - `class ActionAuthError extends Error` e `requireActionUser(roles?: readonly string[]): Promise<AuthenticatedUser>`, que **lança** em vez de redirecionar. Serve para as Server Actions das próximas fases.

- [ ] **Step 1: Configurar o Vitest**

`vitest.config.ts`: `environment: 'node'` por padrão (arquivos de componente usam `// @vitest-environment jsdom`), `esbuild: { jsx: 'automatic' }`, alias `@` para a raiz e `include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs']`. Converter `scripts/assert-local-db.test.mjs` para a API do Vitest, ou manter `node:test` e rodá-lo à parte no script `test` (à escolha do implementador; o comando `npm test` tem de rodar os dois).

- [ ] **Step 2: Escrever os testes que falham**

`src/server/permissions.test.ts`:
```ts
expect(isManager('ORGANIZER')).toBe(true);
expect(MANAGER_ROLES).toContain('ORGANIZER');
expect(OPERATOR_ROLES).not.toContain('VIEWER');
expect(canAccessOwnerData('USER', 'u1', 'u2')).toBe(false);
expect(canAccessOwnerData('MANAGER', 'u1', 'u2')).toBe(true);
```

`src/server/session.test.ts` (com `vi.mock` de `next/headers`, `next/navigation` e `./auth`; `redirect`/`forbidden`/`notFound` mockados para lançar `Error('REDIRECT:/login')` etc.):
```ts
it('requireUser redireciona sem sessão', async () => {
  mockAuth(null);
  await expect(requireUser()).rejects.toThrow('REDIRECT:/login');
});
it('requireRole recusa VIEWER (usuário bloqueado/expirado)', async () => {
  mockAuth({ id: 'u1', role: 'VIEWER' });
  await expect(requireRole(OPERATOR_ROLES)).rejects.toThrow(/FORBIDDEN|NOT_FOUND/);
});
it('requireRole aceita ORGANIZER como manager', async () => {
  mockAuth({ id: 'u1', role: 'ORGANIZER' });
  await expect(requireRole(MANAGER_ROLES)).resolves.toMatchObject({ id: 'u1' });
});
it('requireActionUser lança ActionAuthError sem sessão', async () => {
  mockAuth(null);
  await expect(requireActionUser()).rejects.toBeInstanceOf(ActionAuthError);
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL (exports inexistentes)

- [ ] **Step 4: Implementar as constantes e `session.ts`** conforme as Interfaces

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test`
Expected: todos os testes passando, incluindo os da Task 1

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts src/server/session.ts src/server/session.test.ts src/server/permissions.ts src/server/permissions.test.ts scripts/ package.json package-lock.json
git commit -m "feat: helpers de sessão no servidor e constantes de papéis"
```

---

### Task 4: Playwright com smoke test da aplicação atual

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/global-setup.ts`
- Create: `e2e/helpers/auth.ts`
- Create: `e2e/helpers/console.ts`
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (`test:e2e`; devDependency `@playwright/test`)
- Modify: `.gitignore` (`playwright-report/`, `test-results/`)

**Interfaces:**
- Consumes: `TEST_USERS` (Task 2), script `db:test:reset` (Task 1).
- Produces:
  - `loginAs(page: Page, user: keyof typeof TEST_USERS): Promise<void>` em `e2e/helpers/auth.ts`. Hoje ela preenche o formulário de `LoginPage`; a fase 1 muda só o seletor, se for preciso.
  - `trackConsoleErrors(page: Page): () => string[]` em `e2e/helpers/console.ts`. Ignora apenas mensagens do reCAPTCHA quando a chave estiver vazia.
  - Projetos Playwright `desktop` (1440×900, Chromium) e `mobile` (`devices['iPhone 13']`).
  - `webServer`: `next dev -p 3100`, com `env` sobrescrevendo `DATABASE_URL` e `DATABASE_URL_POOLED` pelo valor de `DATABASE_URL_TEST` (o Next não sobrescreve variáveis já presentes em `process.env`). `reuseExistingServer: !process.env.CI`.
  - `globalSetup` roda `npm run db:test:reset` com `execSync`.

- [ ] **Step 1: Escrever `e2e/smoke.spec.ts`**

```ts
test('login do admin abre o painel sem erros no console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await loginAs(page, 'admin');
  await expect(page.getByRole('heading', { name: /painel geral/i })).toBeVisible();
  expect(errors()).toEqual([]);
});
test('sem scroll horizontal no login e no painel', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await loginAs(page, 'admin');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('user A não vê a prova do user B', async ({ page }) => {
  await loginAs(page, 'userA');
  // navegar até Provas pelo menu atual
  await expect(page.getByText('PROVA E2E USER A')).toBeVisible();
  await expect(page.getByText('PROVA E2E USER B')).toHaveCount(0);
});
```

- [ ] **Step 2: Instalar os navegadores e rodar**

Run: `npx playwright install chromium && npm run test:e2e`
Expected: os 3 testes passando nos projetos `desktop` e `mobile`. Se o teste de scroll falhar no mobile, registrar a falha como baseline: anotar com `test.fail()` e um comentário apontando para a Task 5. A Task 5 precisa fazê-lo passar.

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts e2e/ package.json package-lock.json .gitignore
git commit -m "test: playwright com smoke de login, responsividade e isolamento"
```

---

### Task 5: Identidade Arena (tokens, fontes, metadata)

**Files:**
- Modify: `app/layout.tsx`
- Create: `src/styles/tokens.css` (importado por `src/index.css`)
- Modify: `src/index.css` (tokens legados apontam para os valores Arena; base em Barlow; impressão sem cores escuras)
- Create: `e2e/theme.spec.ts`

**Interfaces:**
- Produces: variáveis CSS que as fases seguintes usam e utilitários Tailwind gerados via `@theme`:
  - Cores: `--color-sand` `#f7f3ec`, `--color-surface` `#fffdf9`, `--color-nav` `#efe7da`, `--color-line` `#e2d6c3`, `--color-line-soft` `#efe7da`, `--color-ink-strong` `#2a1f16`, `--color-ink` `#3a2f25`, `--color-ink-muted` `#8a7a68` (ou o tom AA ajustado), `--color-accent` `#b5471b`, `--color-accent-hover` (mais escuro, escolha do implementador), `--color-highlight` `#f3e3cf`. Também as semânticas `--color-success`, `--color-warning` e `--color-danger` na família terrosa (escolha do implementador; todas com contraste AA sobre `--color-surface`).
  - `--font-sans`: Barlow. `--font-display`: Barlow Condensed. Geram as classes `font-sans` e `font-display`.
  - `--radius-ui: 4px`.
- Produces: tokens legados (`--surface-page`, `--surface-raised`, `--surface-subtle`, `--line-subtle`, `--ink-strong`, `--ink-default`, `--ink-muted`, `--brand-amber`, `--brand-blue`, `--brand-navy`) redefinidos a partir dos tokens Arena. A camada de `!important` continua até a fase 5, mas passa a pintar a UI antiga na paleta Arena.
- Produces: `metadata.title` = `Sorteios Lagoa | Gestão de provas e sorteios de laço`.

- [ ] **Step 1: Escrever `e2e/theme.spec.ts`**

```ts
test('identidade Arena aplicada', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/^Sorteios Lagoa/);
  const body = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { bg: s.backgroundColor, font: s.fontFamily };
  });
  expect(body.bg).toBe('rgb(247, 243, 236)');
  expect(body.font).toMatch(/Barlow/);
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx playwright test e2e/theme.spec.ts --project=desktop`
Expected: FAIL (título "Team Roping Pro" e fundo `rgb(246, 248, 250)`)

- [ ] **Step 3: Implementar**

Em `app/layout.tsx`, carregar `Barlow` e `Barlow_Condensed` com `next/font/google` (`subsets: ['latin', 'latin-ext']`, `variable`, `display: 'swap'`) e aplicar as variáveis no `<html>`. Em `tokens.css`, definir `@theme` e as variáveis. Em `src/index.css`, remover as referências a Plus Jakarta/JetBrains e garantir `overflow-x: clip` em `body`, que destrava o teste de scroll da Task 4 se ele estiver marcado como `test.fail()`.

- [ ] **Step 4: Rodar a suíte e2e inteira**

Run: `npm run test:e2e`
Expected: tudo passando, com nenhum `test.fail()` restante.

- [ ] **Step 5: Revisão visual**

Tirar screenshots do login e do painel nos dois projetos (`page.screenshot` num teste temporário ou no trace) e conferir que a UI antiga ficou legível na paleta Arena: texto suave legível e botões principais em terracota. Corrigir contrastes nos tokens, não nos componentes.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx src/styles/tokens.css src/index.css e2e/theme.spec.ts
git commit -m "feat: identidade visual Arena com tokens, fontes e metadata"
```

---

### Task 6: Primitivas de UI

**Files:**
- Modify: `src/components/ui/cn.ts` (passa a usar `clsx` + `tailwind-merge`, ambos já instalados; mantém a assinatura)
- Modify: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Input.tsx`, `Select.tsx`, `Badge.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `PageHeader.tsx`, `StatTile.tsx`, `ConfirmDialog.tsx`, `Toaster.tsx`
- Create: `src/components/ui/index.ts` (barrel)
- Create: `src/components/ui/ConfirmDialog.test.tsx`, `src/components/ui/Badge.test.tsx`
- Create: `app/dev/ui/page.tsx` (vitrine que chama `notFound()` em produção)
- Create: `e2e/ui-primitives.spec.ts`
- Modify: `app/layout.tsx` (monta `<Toaster />`)
- Modify: `package.json` (dependency `sonner`)

**Interfaces:**
- Consumes: os tokens da Task 5 (`bg-accent`, `text-ink-strong`, `font-display`, `rounded-ui` etc.).
- Produces:
  - `Button`: mesma API de hoje (`variant: 'primary' | 'secondary' | 'ghost' | 'danger'`, `size: 'sm' | 'md'`), mais `size: 'lg'` e `loading?: boolean`. Com `loading`, o botão fica desabilitado, mostra um spinner e recebe `aria-busy`. Visual: `primary` em terracota; rótulos em `font-display` uppercase com tracking leve.
  - `Input` e `Select`: `forwardRef`, com props nativas mais `label: string`, `error?: string` e `hint?: string`. O `id` sai de `useId`; o erro é ligado ao campo por `aria-describedby` e `aria-invalid`.
  - `Badge`: `{ tone: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; children }`, mais o helper `eventStatusBadge(status: 'DRAFT' | 'OPEN' | 'DRAWN' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'): { label: string; tone }`. Os rótulos seguem a seção 29 da referência técnica: DRAFT e OPEN = "Aberta", DRAWN = "Sorteada", IN_PROGRESS = "Em andamento", FINISHED = "Finalizada", CANCELLED = "Cancelada".
  - `Skeleton`: `{ className?: string }`, um bloco com pulso suave e `aria-hidden`.
  - `EmptyState`: `{ icon?: LucideIcon; title: string; description?: string; action?: ReactNode }`.
  - `PageHeader`: `{ eyebrow?: string; title: string; description?: string; actions?: ReactNode }`. O título vai em `font-display` uppercase.
  - `StatTile`: `{ label: string; value: string | number; hint?: string }`. O valor vai em `font-display` grande, com `tabular-nums`.
  - `ConfirmDialog` (client): `useConfirm(): (opts: { title: string; description?: string; confirmLabel?: string; cancelLabel?: string; tone?: 'default' | 'danger' }) => Promise<boolean>`, com um `<ConfirmProvider>` montado em `app/layout.tsx`. A implementação usa `<dialog>` nativo com `showModal()`. Esc e clique no backdrop resolvem `false`, e o foco volta ao elemento que tinha foco antes de abrir.
  - `Toaster` (client): reexporta `<Toaster />` do `sonner` com tema Arena e posição `bottom-right` (`top-center` em telas abaixo de 640px) e exporta `toast` do `sonner`.

- [ ] **Step 1: Escrever os testes que falham**

`ConfirmDialog.test.tsx` (`// @vitest-environment jsdom`; usar um polyfill de `HTMLDialogElement.prototype.showModal/close` no setup, porque o jsdom não os implementa):
```tsx
it('resolve true ao confirmar', async () => { /* clicar "Confirmar" → promise resolve true */ });
it('resolve false com Esc', async () => { /* user.keyboard('{Escape}') → false */ });
it('devolve o foco ao gatilho', async () => { /* após fechar, document.activeElement === botão gatilho */ });
it('usa os rótulos informados', async () => { /* confirmLabel "Cancelar prova" aparece */ });
```

`Badge.test.tsx`:
```ts
expect(eventStatusBadge('DRAFT')).toEqual({ label: 'Aberta', tone: 'neutral' });
expect(eventStatusBadge('OPEN').label).toBe('Aberta');
expect(eventStatusBadge('DRAWN').label).toBe('Sorteada');
expect(eventStatusBadge('CANCELLED')).toMatchObject({ label: 'Cancelada', tone: 'danger' });
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Implementar as primitivas** conforme as Interfaces

O `Button` mantém compatibilidade com quem já o usa: rodar `grep -rn "ui/Button" src` antes e confirmar que nenhum chamador quebra.

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: tudo passando

- [ ] **Step 5: Criar a vitrine `app/dev/ui/page.tsx` e `e2e/ui-primitives.spec.ts`**

A vitrine mostra todas as variantes, um formulário com erro, um `EmptyState`, 3 `StatTile`, skeletons, um botão que abre o `ConfirmDialog` e um botão que dispara um toast. O teste e2e:
```ts
test('vitrine de primitivas sem erros e sem scroll horizontal', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/dev/ui');
  await page.getByRole('button', { name: 'Abrir confirmação' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostrar toast' }).click();
  await expect(page.getByText('Tudo certo')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors()).toEqual([]);
});
```

- [ ] **Step 6: Rodar o e2e e revisar as screenshots desktop e mobile da vitrine**

Run: `npm run test:e2e`
Expected: tudo passando. Nas screenshots, conferir a hierarquia (títulos condensados em caixa alta), o foco visível e o contraste.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui app/dev app/layout.tsx e2e/ui-primitives.spec.ts package.json package-lock.json
git commit -m "feat: primitivas de UI na identidade Arena"
```

---

### Task 7: Fechamento da fase

**Files:**
- Modify: `docs/project-technical-reference.md` (seções 3 Scripts, 18 Variáveis e 30 Testes: banco local, scripts novos, Vitest e Playwright)

- [ ] **Step 1: Rodar a verificação completa**

Run: `npm run lint && npm test && npm run test:e2e && npm run build`
Expected: os quatro comandos verdes. O `build` não pode depender de `.env.local`: ele roda `prisma generate`, que não conecta ao banco.

- [ ] **Step 2: Conferir que a produção não foi tocada**

Run: `git diff main --stat -- prisma/schema.prisma prisma/migrations`
Expected: nenhuma alteração.

- [ ] **Step 3: Atualizar a referência técnica e commitar**

```bash
git add docs/project-technical-reference.md
git commit -m "docs: banco local, scripts e testes da fase 0"
```
