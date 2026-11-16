# Fase 1 — Shell e rotas: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar a aplicação do SPA client-side (`src/App.tsx`) e colocá-la em rotas App Router com URL própria. Isso inclui login novo, shell com menu lateral e drawer na identidade Arena, proteção das páginas no servidor e leitura de dados em Server Components. As telas antigas continuam sendo reutilizadas por dentro.

**Architecture:** O `app/(app)/layout.tsx` exige sessão no servidor e renderiza o `AppShell`. Cada página é um Server Component que lê dados por novos *services* de leitura (`src/server/services/*`), com o mesmo escopo de dono das rotas `/api`, e entrega os dados a um pequeno *client bridge*. O bridge renderiza o componente antigo e faz as mutações pelos endpoints `/api` existentes, seguidas de `router.refresh()`. Nesta fase as mutações não viram Server Actions; isso acontece nas fases 2 a 4, tela por tela.

**Tech Stack:** Next.js 16.4 App Router, React 19.2, Prisma 6.19, Auth.js core, Tailwind 4 (tokens Arena), Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-11-16-refatoracao-ux-arquitetura-design.md](../specs/2026-11-16-refatoracao-ux-arquitetura-design.md), seções 5, 6.1, 6.2, 6.3 e 9 (fase 1).
**Fase anterior:** [2026-11-16-fase-0-fundacao.md](2026-11-16-fase-0-fundacao.md), no PR roquicelmo/rc-horse-sports#1.

## Global Constraints

- **Branch:** `refactor/fase-1-rotas`, criado a partir de `refactor/ux-arquitetura` (fase 0, ainda não mesclada). O PR aponta para `main` depois que o #1 for mesclado; até lá, aponta para `refactor/ux-arquitetura`.
- **Schema e migrations intocados.** Os endpoints `/api/*` continuam funcionando; os handlers GET passam a delegar aos services, mas o JSON de resposta não muda.
- **URLs em pt-BR:**
  - `/login`
  - `/` (painel)
  - `/provas`, `/provas/[eventId]`, `/provas/[eventId]/inscricoes`, `/provas/[eventId]/sorteio`, `/provas/[eventId]/pista`, `/provas/[eventId]/locucao`, `/provas/[eventId]/resultado`
  - `/atletas`, `/agenda`, `/sorteio-avulso`, `/usuarios`, `/relatorios`
- **Ownership no servidor:**
  - User vê apenas os próprios registros; Admin, Manager e o legado Organizer veem todos.
  - Prova fora do escopo ou inexistente responde `notFound()`.
  - `/usuarios` exige `MANAGER_ROLES`; outros papéis recebem 404.
- **Componentes novos usam as primitivas de `src/components/ui` e os tokens Arena.** Nunca usar `text-white`, que a camada legada sobrescreve; usar `text-on-accent`.
- **Cada rota tem `loading.tsx` (skeleton) e `error.tsx`.**
- **Textos em pt-BR.** O título do app é "Sorteios Lagoa"; não deve restar "Team Roping Pro" nem "Henrique Lagoa" fixo na interface.
- **reCAPTCHA:** o cliente lê `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. O `next.config.ts` preenche essa variável a partir de `VITE_RECAPTCHA_SITE_KEY` quando ela não existir, para não exigir reconfiguração na Vercel.
- Lint, `npm test`, `npm run test:e2e` e `npm run build` verdes ao fim de cada task.

## Review Focus

1. **Link direto para a prova de outro usuário**, por exemplo o User B abrindo `/provas/<id do A>/pista` → 404 sem vazar nenhum dado. Teste na Task 5.
2. **Sessão expirada no meio do uso** (cookies apagados) → a próxima navegação leva para `/login`, sem tela quebrada. Teste na Task 3.
3. **Recarregar ou usar voltar/avançar numa tela profunda** como `/provas/[id]/pista` → a mesma tela volta com os dados persistidos, porque a URL é a fonte da verdade. Teste na Task 5.
4. **Drawer no celular** → Esc fecha e devolve o foco ao botão de menu; escolher um item navega e fecha o drawer. Teste na Task 3.
5. **Senha errada ou usuário bloqueado no login** → mensagem clara no formulário, sem travar e sem erro no console. Teste na Task 2.

---

### Task 1: Services de leitura e mapeadores

**Files:**
- Create: `src/server/services/scope.ts`, `src/server/services/athletes.ts`, `src/server/services/arenas.ts`, `src/server/services/events.ts`, `src/server/services/users.ts`, `src/server/services/draws.ts`
- Create: `src/lib/mappers.ts` (puro, usado no cliente e no servidor)
- Create: `src/server/services/scope.test.ts`, `src/lib/mappers.test.ts`
- Modify: GET de `src/server/routes/athletes/index.ts`, `arenas/index.ts`, `events/index.ts` e `users/index.ts`, que passam a chamar os services
- Modify: `src/App.tsx` (importa `mapPersistedRuns` e `toCompetitor` de `src/lib/mappers.ts` em vez de declará-los)

**Interfaces:**
- Consumes: `AuthenticatedUser` (`src/server/auth.ts`), `MANAGER_ROLES` e `isManager`/`isAdmin` (`permissions.ts`), `prisma`.
- Produces:
  - `ownerScope(user: { id: string; role: string }, ownerId?: string): { ownerId?: string }`. Para User devolve `{ ownerId: user.id }` e ignora o filtro pedido. Para manager devolve `{ ownerId }` quando há filtro e `{}` quando não há.
  - `eventScope(user, ownerId?)`: mesma regra aplicada a `createdById`.
  - `listAthletes(user, opts?: { ownerId?: string }): Promise<Competitor[]>`, com atletas ativos, ordenados por nome e mapeados por `toCompetitor`.
  - `listArenas(user, opts?): Promise<ArenaOption[]>`.
  - `listEvents(user, opts?): Promise<EventSummary[]>`, com status já traduzido para a interface (DRAFT e OPEN = "ABERTA" etc., seção 29 da referência técnica).
  - `getEvent(user, eventId: string): Promise<EventSummary | null>`. Devolve `null` quando a prova não existe ou está fora do escopo.
  - `listOwners(user): Promise<Array<{ id: string; name: string | null; email: string }>>`. Devolve `[]` para quem não é manager.
  - `getLatestDrawRuns(user, eventId): Promise<Run[] | null>`. Usa a versão mais recente do sorteio, mapeada por `mapPersistedRuns`; devolve `null` fora do escopo e `[]` sem sorteio.
  - `getEventRegistrations(user, eventId): Promise<{ cabeceiros: Competitor[]; pezeiros: Competitor[] } | null>`. Usa só inscrições `ACTIVE`; devolve `null` fora do escopo.
  - Em `src/lib/mappers.ts`: `PersistedAthlete`, `PersistedRun`, `toCompetitor(athlete, role?: 'head' | 'heel')`, `mapPersistedRuns(runs: PersistedRun[]): Run[]` (movidos do `App.tsx` sem mudar o comportamento), `eventStatusLabel(status: DbEventStatus): EventSummary['status']` e `toEventSummary(event): EventSummary`.
  - Todos os services importam `'server-only'`.

- [ ] **Step 1: Escrever os testes que falham**

`scope.test.ts`:
```ts
expect(ownerScope({ id: 'u1', role: 'USER' }, 'u2')).toEqual({ ownerId: 'u1' });
expect(ownerScope({ id: 'm1', role: 'MANAGER' })).toEqual({});
expect(ownerScope({ id: 'm1', role: 'ORGANIZER' }, 'u2')).toEqual({ ownerId: 'u2' });
expect(eventScope({ id: 'u1', role: 'USER' })).toEqual({ createdById: 'u1' });
```

`mappers.test.ts`:
```ts
expect(eventStatusLabel('DRAFT')).toBe('ABERTA');
expect(eventStatusLabel('IN_PROGRESS')).toBe('EM ANDAMENTO');
const [run] = mapPersistedRuns([persistedRunFixture({ numberOfBulls: 2, times: [{ bullNumber: 1, timeSeconds: '8.12', isNt: false }] })]);
expect(run.bois).toBe(2);
expect(run.times.boi1).toBe('8.12');
expect(run.times.boi2).toBe('');
expect(run.faseLabel).toBe('Fase 1: Cabeceiros A × Pezeiros B');
expect(toCompetitor(athleteFixture({ headHandicap: '3.5', heelHandicap: '2' }), 'heel').handicap).toBe(2);
```
(`persistedRunFixture` e `athleteFixture` são helpers locais do teste.)

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Implementar os services e os mapeadores, e fazer os GETs de `/api` delegarem a eles**

Nos handlers, o GET devolve o mesmo JSON de antes. Os services de lista devolvem modelos de tela; por isso os handlers chamam uma função interna `findAthletesRaw` e equivalentes, ou os services expõem as duas formas, à escolha do implementador. O que precisa ficar igual é o shape do JSON de `/api`.

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run test:e2e`
Expected: unidade verde e os 14 testes e2e da fase 0 verdes, já que o comportamento é o mesmo.

- [ ] **Step 5: Commit** — `refactor: services de leitura com escopo de dono e mapeadores compartilhados`

---

### Task 2: Rota `/login` na identidade Arena

**Files:**
- Create: `app/login/page.tsx` (server: se `getCurrentUser()` existir, `redirect('/')`)
- Create: `app/login/LoginForm.tsx` e `app/login/AccessRequestForm.tsx` (client)
- Modify: `next.config.ts` (bloco `env` com `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`)
- Modify: `.env.local.example` e `.env.example` (`NEXT_PUBLIC_RECAPTCHA_SITE_KEY`)
- Modify: `e2e/helpers/auth.ts` (`loginAs` passa a usar `/login` e espera a URL `/`)
- Create: `e2e/login.spec.ts`

**Interfaces:**
- Consumes: `authClient.login`/`requestAccess` (`src/auth/session.ts`), primitivas `Input`, `Button` e `toast`.
- Produces:
  - Página `/login` com o título "Entrar" (`h1`) e os campos com rótulo "E-mail" e "Senha". O botão "Mostrar senha" tem `aria-label`, o botão de envio diz "Entrar", e há um link-botão "Ainda não tenho acesso" que troca para o formulário de solicitação.
  - Com sucesso, chama `router.replace('/')` e depois `router.refresh()`.
  - O erro aparece dentro do formulário (`role="alert"`), com o texto do `authClient` ou "E-mail ou senha inválidos."
- Visual:
  - Fundo areia; cartão `surface` com borda `line`.
  - Marca "Sorteios Lagoa" em `font-display` caixa alta.
  - Botão principal terracota.
  - No desktop, uma coluna lateral decorativa com o texto "Provas de laço em dupla" em `font-display` grande.
  - No mobile, só o cartão.

- [ ] **Step 1: Escrever `e2e/login.spec.ts`**

```ts
test('visitante em / é levado para /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
});
test('senha errada mostra erro no formulário sem erros de console', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(TEST_USERS.userA.email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/inválid/i);
  await expect(page).toHaveURL(/\/login$/);
  expect(errors()).toEqual([]);
});
test('usuário logado que abre /login volta para o painel', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/login');
  await expect(page).toHaveURL(/\/$/);
});
test('alterna para solicitação de acesso', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Ainda não tenho acesso' }).click();
  await expect(page.getByLabel('Telefone')).toBeVisible();
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx playwright test e2e/login.spec.ts --project=desktop`
Expected: FAIL (`/login` responde 404)

- [ ] **Step 3: Implementar `/login`.** Nesta task `/` ainda é o `App.tsx`. Para o primeiro teste passar, `app/page.tsx` vira um Server Component que faz `redirect('/login')` sem sessão e renderiza `<App />` com sessão. O `App.tsx` passa a pular a própria checagem quando recebe a prop `initialSession`. O `LoginPage.tsx` antigo deixa de ser importado.

- [ ] **Step 4: Rodar tudo**

Run: `npm run test:e2e`
Expected: tudo verde, incluindo os specs da fase 0 com o novo `loginAs`.

- [ ] **Step 5: Commit** — `feat: rota /login na identidade Arena com solicitação de acesso`

---

### Task 3: Shell autenticado com menu lateral e drawer

**Files:**
- Create: `app/(app)/layout.tsx` (server: `requireUser()`, monta o menu conforme o papel e renderiza `AppShell`)
- Create: `src/components/shell/AppShell.tsx`, `SidebarNav.tsx`, `MobileDrawer.tsx`, `LogoutButton.tsx` (client) e `navItems.ts`
- Create: `src/components/shell/navItems.test.ts`
- Move: `app/page.tsx` para `app/(app)/page.tsx`. Ainda renderiza `<App />`, agora sem a própria sidebar e o próprio header (ver Step 3).
- Create: `app/(app)/loading.tsx` e `app/(app)/error.tsx` (compartilhados: `src/components/shell/RouteSkeleton.tsx` e `RouteError.tsx`)
- Create: `e2e/shell.spec.ts`

**Interfaces:**
- Consumes: `requireUser`, `MANAGER_ROLES`, primitivas.
- Produces:
  - `navItemsFor(role: string): NavItem[]`, com `NavItem = { href: string; label: string; icon: LucideIcon }`. A ordem é:

| Rótulo | href | Quem vê |
|---|---|---|
| Painel | `/` | todos |
| Provas | `/provas` | todos |
| Atletas | `/atletas` | todos |
| Agenda | `/agenda` | todos |
| Sorteio avulso | `/sorteio-avulso` | todos |
| Usuários | `/usuarios` | só `MANAGER_ROLES` |
| Relatórios | `/relatorios` | todos |

  - `AppShell({ user: { name: string | null; email: string; role: string }, navItems, children })`.
  - Desktop (≥1024px): sidebar fixa de 248px em `nav`. Item ativo em bloco `ink-strong` com texto `sand`, marcado com `aria-current="page"` (via `usePathname`). Um item é ativo quando `pathname === href`, ou, se `href !== '/'`, quando o `pathname` começa com `href + '/'`. No rodapé ficam o nome e o papel do usuário e o `LogoutButton`.
  - Mobile: topo com o botão "Abrir menu" e a marca. O drawer usa `<dialog>` modal: Esc e clique fora fecham, o foco volta ao botão, e navegar fecha o drawer.
  - `LogoutButton`: chama `authClient.logout()`, depois `router.replace('/login')` e `router.refresh()`.
  - As rotas que ainda não existem (`/provas` etc.) caem no `not-found` padrão até a Task 4; o teste desta task só navega entre `/` e `/sorteio-avulso`, que cria um placeholder mínimo (`PageHeader` "Sorteio avulso").

- [ ] **Step 1: Escrever os testes que falham**

`navItems.test.ts`:
```ts
expect(navItemsFor('USER').map((i) => i.href)).not.toContain('/usuarios');
expect(navItemsFor('ORGANIZER').map((i) => i.href)).toContain('/usuarios');
expect(navItemsFor('ADMIN')[0]).toMatchObject({ href: '/', label: 'Painel' });
```

`e2e/shell.spec.ts`:
```ts
test('menu marca a página atual e navega', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  await openNav(page, isMobile);
  await page.getByRole('link', { name: 'Sorteio avulso' }).click();
  await expect(page).toHaveURL(/\/sorteio-avulso$/);
  await openNav(page, isMobile);
  await expect(page.getByRole('link', { name: 'Sorteio avulso' })).toHaveAttribute('aria-current', 'page');
});
test('user não vê Usuários', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  await openNav(page, isMobile);
  await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0);
});
test('drawer fecha com Esc e devolve o foco', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'somente mobile');
  await loginAs(page, 'userA');
  const button = page.getByRole('button', { name: 'Abrir menu' });
  await button.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button).toBeFocused();
});
test('sessão apagada leva ao login na próxima navegação', async ({ page, context }) => {
  await loginAs(page, 'userA');
  await context.clearCookies();
  await page.goto('/sorteio-avulso');
  await expect(page).toHaveURL(/\/login$/);
});
test('sair volta para o login', async ({ page, isMobile }) => {
  await loginAs(page, 'userA');
  await openNav(page, isMobile);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
```
`openNav(page, isMobile)` vai em `e2e/helpers/auth.ts`: no mobile clica em "Abrir menu"; no desktop não faz nada. O `openSection` antigo é removido e o spec `smoke.spec.ts` passa a navegar por URL (`page.goto('/provas')`) na Task 4.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test && npx playwright test e2e/shell.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implementar.** O `App.tsx` recebe a prop `embedded`, que esconde a `Sidebar` e o `header` dele, e passa a renderizar só o `<main>`. A navegação interna do `App` continua funcionando até a Task 4.

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run test:e2e`
Expected: verde. O spec `user A não vê a prova do user B`, do smoke, pode ser marcado com `test.fixme` e um comentário apontando para a Task 4, porque o menu antigo deixou de existir.

- [ ] **Step 5: Commit** — `feat: shell autenticado com menu lateral, drawer e logout`

---

### Task 4: Rotas das seções gerais

**Files:**
- Create (com `page.tsx`, `loading.tsx` e, quando houver mutação, um `*Client.tsx`):
  - `app/(app)/page.tsx` (painel)
  - `app/(app)/provas/`
  - `app/(app)/atletas/`
  - `app/(app)/agenda/`
  - `app/(app)/relatorios/`
  - `app/(app)/usuarios/`
- Modify: `src/components/Dashboard.tsx`: remove as props `selectedPezeiros`, `selectedCabeceiros` e `runs`, que são do wizard antigo, e recebe `onStartDraw` como `href`.
- Modify: `src/components/EventsPage.tsx`: `onOpenEvent` vira um link para `/provas/[id]`.
- Modify: `e2e/smoke.spec.ts` (reativa o teste de isolamento usando `page.goto('/provas')`)
- Create: `e2e/sections.spec.ts`

**Interfaces:**
- Consumes: os services da Task 1, os componentes antigos, `requireUser` e `requireRole(MANAGER_ROLES)` em `/usuarios`.
- Produces:
  - Cada página server chama `requireUser()` (ou `requireRole`), lê os dados pelos services em paralelo (`Promise.all`) e renderiza `PageHeader` mais o componente antigo, ou o bridge.
  - Títulos dos `PageHeader`:

| Rota | Título |
|---|---|
| `/` | Painel |
| `/provas` | Provas e arenas |
| `/atletas` | Atletas |
| `/agenda` | Minha agenda |
| `/relatorios` | Relatórios |
| `/usuarios` | Usuários |

  - Bridges client, todos com o mesmo padrão: chamam o `/api` existente, mostram `toast.error(message)` em caso de falha, e em caso de sucesso `toast.success` mais `router.refresh()`.
    - `EventsClient`: `onCreate`, `onUpdate` e `onDelete`. O `onDelete` usa `useConfirm` no lugar de `window.confirm`, com o título "Cancelar a prova?" e o botão "Cancelar prova".
    - `AthletesClient`: `onAdd` abre o `NewCompetitorModal` e faz POST em `/api/athletes`; `onRemove` faz DELETE com `useConfirm`.
  - Os filtros por dono que os componentes antigos já fazem no cliente continuam iguais nesta fase.
  - O painel deixa de mostrar dados do wizard; os 3 cards passam a ser atletas, provas e provas abertas, usando `StatTile`.

- [ ] **Step 1: Escrever `e2e/sections.spec.ts`**

```ts
for (const [path, heading] of [['/', 'Painel'], ['/provas', 'Provas e arenas'], ['/atletas', 'Atletas'], ['/agenda', 'Minha agenda'], ['/relatorios', 'Relatórios']] as const) {
  test(`${path} abre com título e sem erros`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await loginAs(page, 'userA');
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    expect(await hasNoHorizontalScroll(page)).toBe(true);
    expect(errors()).toEqual([]);
  });
}
test('atletas do user A aparecem e os do B não', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await expect(page.getByText('CABECEIRO A1')).toBeVisible();
  await expect(page.getByText('CABECEIRO B1')).toHaveCount(0);
});
test('/usuarios responde 404 para user e abre para manager', async ({ page }) => {
  await loginAs(page, 'userA');
  const response = await page.goto('/usuarios');
  expect(response?.status()).toBe(404);
  await loginAs(page, 'manager');
  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuários' })).toBeVisible();
});
test('cancelar prova pede confirmação e Esc não cancela', async ({ page }) => {
  await loginAs(page, 'userB');
  await page.goto('/provas');
  await page.getByRole('button', { name: /cancelar/i }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('PROVA E2E USER B')).toBeVisible();
});
```

O `loginAs` limpa os cookies antes de entrar, para permitir trocar de usuário no mesmo teste.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx playwright test e2e/sections.spec.ts --project=desktop`
Expected: FAIL

- [ ] **Step 3: Implementar as páginas, os bridges e os `loading.tsx`**

Os skeletons usam `RouteSkeleton` com as variantes `list` e `cards`, a mesma forma do layout final.

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run test:e2e`
Expected: verde, sem nenhum `test.fixme` restante.

- [ ] **Step 5: Commit** — `feat: rotas do painel, provas, atletas, agenda, relatórios e usuários`

---

### Task 5: Rotas da prova (detalhes, inscrições, sorteio, pista, locução, resultado)

**Files:**
- Create: `app/(app)/provas/[eventId]/layout.tsx`
  - Server.
  - Chama `getEvent`; se vier `null`, `notFound()`.
  - Renderiza `PageHeader` com o nome da prova, a data, a arena e o `Badge` de status.
  - Renderiza abas de navegação (`EventTabs`, client, com `aria-current`): Visão geral, Inscrições, Sorteio, Pista, Locução, Resultado.
- Create: `page.tsx` e `loading.tsx` em `[eventId]/`, `inscricoes/`, `sorteio/`, `pista/`, `locucao/` e `resultado/`
- Create: bridges `RegistrationsClient.tsx`, `DrawClient.tsx`, `TrackClient.tsx`, `AnnouncerClient.tsx` e `ResultsClient.tsx`, ao lado de cada página
- Modify: `src/components/EventDetailsPage.tsx`: os callbacks `onOpen*` viram links para as sub-rotas, e `onBack` é removido.
- Create: `e2e/event-routes.spec.ts`

**Interfaces:**
- Consumes: `getEvent`, `getEventRegistrations`, `getLatestDrawRuns` (Task 1), `mapPersistedRuns`, os componentes antigos `RegistrationPage`, `DrawConfiguration`, `RunsTable`, `AnnouncerPage` e `ResultsPage`.
- Produces:
  - `inscricoes`: renderiza o `RegistrationPage` com os atletas do escopo (`listAthletes`), sem `onBack`. As mutações continuam dentro do componente antigo, seguidas de `router.refresh()`.
  - `sorteio`: o `DrawClient` recebe `cabeceiros` e `pezeiros` de `getEventRegistrations`, que são a única fonte (spec 6.4), e a configuração padrão do `App.tsx` (`numGroups: 3`, `minGap: 5`, `balanceGroups: false`, `batteryMode: 'phases'`, `numBatteries: 9`).
    - Gerar faz POST em `/api/events/[id]/draws`.
    - Com sucesso: `toast.success('Sorteio gerado')` e `router.push('/provas/[id]/pista')`.
    - Com erro: `toast.error(message)`.
    - Sem cabeceiro ou sem pezeiro: `EmptyState` "Inscrições insuficientes", com link para Inscrições.
  - `pista`: o `TrackClient` recebe `runs` de `getLatestDrawRuns` e renderiza o `RunsTable`.
    - `onUpdateTime` faz PATCH em `/api/runs/[runId]/times`, com a lógica atual de `handleUpdateTime` movida do `App.tsx`; `onClearAllTimes` também.
    - `onReDraw` e `onBackToConfig` levam a `/sorteio`.
    - Sem sorteio: `EmptyState` "Nenhum sorteio gerado", com link para Sorteio.
  - `locucao`: `AnnouncerPage` com `runs`; `onOpenRun` leva a `/pista`.
  - `resultado`: `ResultsPage` com `runs`, `published` = status `FINALIZADA`. `onPublish` faz POST em `/api/events/[id]/results/publish`, seguido de `router.refresh()` e toast.
  - O confete do `App.tsx` fica no `DrawClient` (`canvas-confetti`, import dinâmico).

- [ ] **Step 1: Escrever `e2e/event-routes.spec.ts`**

```ts
test('fluxo do user A: inscrições → sorteio → pista com tempo persistido', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('link', { name: TEST_EVENTS.userA }).click();
  await expect(page.getByRole('heading', { level: 1, name: TEST_EVENTS.userA })).toBeVisible();
  await page.getByRole('link', { name: 'Inscrições' }).click();
  await expect(page.getByText('CABECEIRO A1')).toBeVisible();
  await page.getByRole('link', { name: 'Sorteio' }).click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page).toHaveURL(/\/pista$/);
  const firstTime = page.getByRole('textbox').first();
  await firstTime.fill('8.12');
  await firstTime.press('Tab');
  await expect(page.getByText(/salv|registrad/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('textbox').first()).toHaveValue(/8[.,]12/);
});
test('user B recebe 404 nas rotas da prova do user A', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('link', { name: TEST_EVENTS.userA }).click();
  const eventUrl = new URL(page.url()).pathname;
  await loginAs(page, 'userB');
  for (const suffix of ['', '/inscricoes', '/sorteio', '/pista', '/locucao', '/resultado']) {
    const response = await page.goto(eventUrl + suffix);
    expect(response?.status(), suffix).toBe(404);
    await expect(page.getByText(TEST_EVENTS.userA)).toHaveCount(0);
  }
});
test('voltar e avançar mantêm a tela da prova', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('link', { name: TEST_EVENTS.userA }).click();
  await page.getByRole('link', { name: 'Locução' }).click();
  await page.goBack();
  await expect(page.getByRole('link', { name: 'Visão geral' })).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(page).toHaveURL(/\/locucao$/);
});
```

Os seletores do campo de tempo e do texto de confirmação dependem do `RunsTable` atual. Confirme-os e ajuste-os ao ler o componente, mantendo as asserções.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx playwright test e2e/event-routes.spec.ts --project=desktop`
Expected: FAIL

- [ ] **Step 3: Implementar o layout da prova, as páginas e os bridges**

- [ ] **Step 4: Rodar tudo**

Run: `npm test && npm run test:e2e`
Expected: verde

- [ ] **Step 5: Commit** — `feat: rotas da prova com abas, sorteio, pista, locução e resultado`

---

### Task 6: Sorteio avulso e remoção do `App.tsx`

**Files:**
- Create: `app/(app)/sorteio-avulso/page.tsx` (server: `listAthletes`) e `QuickDrawClient.tsx` (client), substituindo o placeholder da Task 3
- Delete: `src/App.tsx`, `src/components/Sidebar.tsx`, `src/components/LoginPage.tsx`, `src/components/SectionPlaceholder.tsx`
- Modify: `docs/project-technical-reference.md` (seções 4, 6, 23, 28 e 31: nova estrutura de rotas)
- Create: `e2e/quick-draw.spec.ts`

**Interfaces:**
- Consumes: `listAthletes`, `TransferList`, `WizardHeader`, `DrawConfiguration`, `RunsTable`, `executeGroupCrossDraw`, `NewCompetitorModal`.
- Produces:
  - `QuickDrawClient` com o wizard atual de 4 etapas (pezeiros → cabeceiros → configuração → corridas), todo em estado local e sem persistir, gerado com `executeGroupCrossDraw`.
  - Os tempos digitados ficam só na memória, que é o comportamento atual. O PDF desse fluxo vem na fase 3.
  - O cadastro rápido de atleta faz POST em `/api/athletes`, seguido de `router.refresh()`.

- [ ] **Step 1: Escrever `e2e/quick-draw.spec.ts`**

```ts
test('sorteio avulso gera corridas com os atletas escolhidos', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/sorteio-avulso');
  await expect(page.getByRole('heading', { level: 1, name: 'Sorteio avulso' })).toBeVisible();
  // selecionar todos os pezeiros, avançar, selecionar todos os cabeceiros, avançar, gerar
  await page.getByRole('button', { name: /selecionar todos/i }).click();
  await page.getByRole('button', { name: /avançar para cabeceiros/i }).click();
  await page.getByRole('button', { name: /selecionar todos/i }).click();
  await page.getByRole('button', { name: /avançar para configuração/i }).click();
  await page.getByRole('button', { name: /gerar sorteio/i }).click();
  await expect(page.getByText('CABECEIRO A1').first()).toBeVisible();
});
```

Ajuste os rótulos dos botões aos do `TransferList` e do `DrawConfiguration` atuais.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx playwright test e2e/quick-draw.spec.ts --project=desktop`
Expected: FAIL (ainda é o placeholder)

- [ ] **Step 3: Implementar o `QuickDrawClient` e apagar os arquivos antigos**

Antes de apagar, rode `grep -rn "App'\|/App\"\|Sidebar\|LoginPage\|SectionPlaceholder" app src` para confirmar que nenhuma importação restou.

- [ ] **Step 4: Verificação completa**

Run: `npm run lint && npm test && npm run test:e2e && npm run build`
Expected: tudo verde. Depois, `grep -rn "Team Roping Pro\|Henrique Lagoa" app src --include=*.tsx` não deve retornar nada.

- [ ] **Step 5: Revisão visual**

Tire screenshots de `/login`, `/`, `/provas`, `/provas/[id]/pista` e `/sorteio-avulso`, no desktop (1440) e no mobile (375). Confira:
- se o shell está na identidade Arena;
- se o drawer está correto;
- se não há scroll horizontal.

Componentes internos antigos ainda com aparência mista são esperados nesta fase.

- [ ] **Step 6: Commit** — `feat: sorteio avulso em rota própria e remoção do App.tsx`
