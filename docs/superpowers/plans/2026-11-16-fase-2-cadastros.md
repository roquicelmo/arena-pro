# Fase 2 — Cadastros: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar as telas de atletas, arenas, provas e agenda (e o painel, que lê os mesmos dados) para Server Components com mutações por Server Actions, apoiadas em services de domínio compartilhados com os handlers `/api`. Os componentes antigos dão lugar a componentes novos na identidade Arena, com skeletons, empty states, diálogos de confirmação e toasts. Entra também o **manejo de cadastros** (spec 6.9): Admin e Manager compartilham atletas e arenas com vários usuários, e os seletores de proprietário saem dos modais. O cadastro do atleta ganha clube, notas privadas, cidades oficiais do IBGE e aviso de duplicados (spec 6.10).

**Architecture:** As regras de escrita (ownership, dono pedido por gerente, deduplicação de arena, criação de prova com arena nova em transação) passam a morar em *commands* em `src/server/services/commands/*`, sem `server-only`, para que tanto as Server Actions quanto os handlers `/api` possam importá-los. Cada Server Action (`src/server/actions/*`, `'use server'`) passa por um helper único, `runAction`: `requireActionUser` → `schema.safeParse` (Zod) → command → `revalidatePath`, com retorno `ActionResult<T>`. No cliente, o hook `useAction` cuida do estado pendente, dos erros por campo, dos toasts e da sessão expirada. Os filtros por dono passam para a URL (`?dono=`) e são aplicados no servidor pelos services de leitura. Atletas e arenas ganham tabelas de vínculo (`AthleteShare`, `ArenaShare`, migration aditiva aprovada pelo usuário), e o escopo deles passa a ser "dono ou compartilhado" (`accessScope`); o escopo estrito de dono (`ownerScope`) continua valendo para desativar e para provas.

**Tech Stack:** Next.js 16.4 App Router (Server Actions, `revalidatePath`), React 19.2, Prisma 6.19, Zod 4.6, Tailwind 4 (tokens Arena), sonner, Vitest + Testing Library, Playwright.

**Spec:** [docs/superpowers/specs/2026-11-16-refatoracao-ux-arquitetura-design.md](../specs/2026-11-16-refatoracao-ux-arquitetura-design.md), seções 5, 6.3, 6.5, 6.9, 6.10 e 9 (fase 2). Regras de negócio: [docs/project-technical-reference.md](../../project-technical-reference.md).
**Fase anterior:** [2026-11-16-fase-1-shell-e-rotas.md](2026-11-16-fase-1-shell-e-rotas.md), no PR roquicelmo/rc-horse-sports#2.

## Global Constraints

- **Branch:** `refactor/fase-2-cadastros`, criado a partir de `refactor/fase-1-rotas` (fase 1, ainda não mesclada). O PR aponta para `main` se o #2 já tiver sido mesclado; senão, para `refactor/fase-1-rotas`.
- **Schema:** só as migrations aditivas do compartilhamento (Task 2) e do cadastro do atleta com localidades IBGE (Task 3), aprovadas pelo usuário. Nenhuma outra mudança no schema; nenhuma migration existente é alterada. Nunca `prisma migrate reset` nem `migrate dev` contra banco com dados: a migration é gerada por `prisma migrate diff` e aplicada com `npm run db:local:migrate` (dev) e `npm run db:test:reset` (testes).
- **Endpoints `/api/*` continuam funcionando.** Os handlers de POST/PATCH/DELETE de atletas, arenas e provas passam a delegar aos commands; o JSON de resposta e os status HTTP de sucesso não mudam. Os GETs não mudam.
- **Ownership no servidor, em todo command:**
  - **Atletas e arenas:** User vê e usa os próprios e os compartilhados com ele (`accessScope`). **Editar e desativar** exigem ser o dono ou gerente (`canAccessOwnerData`); usuário só compartilhado recebe "Só o proprietário ou um gerente pode alterar este cadastro." (403).
  - **Notas do atleta** são privadas: cada usuário lê e grava só as próprias (`AthleteNote` por atleta × usuário), em qualquer atleta do seu `accessScope`.
  - **Provas:** um único dono (`createdById`, `eventScope`); não são compartilhadas.
  - Um `ownerId` enviado por User é ignorado (vira o próprio id). Admin, Manager e o legado Organizer (`MANAGER_ROLES`) alteram qualquer registro.
  - **Os formulários de cadastro não têm seletor de proprietário:** o cadastro nasce do usuário que o criou. Atribuir a outros usuários é feito só na tela `/cadastros` (Task 9). A API continua aceitando `ownerId` de gerente, validado (usuário existente e ativo), por compatibilidade.
  - Só `MANAGER_ROLES` compartilham, removem compartilhamento e alteram o responsável de provas.
  - Registro inexistente, inativo ou fora do escopo responde "não encontrado" (404 na API), sem revelar existência.
- **Localidades:** cidade e UF vêm das tabelas locais `BrState`/`Municipality` (código IBGE). O sistema nunca chama a API do IBGE em runtime nem no build; ela só é usada pelo script que gera a migration. Formulários começam em UF **GO** e cidade **Caiapônia** (código lido da tabela, nunca fixado no código), ambos alteráveis. Atleta e arena gravam `cityCode` e também `city`/`state` em texto, copiados do município.
- **Sem CPF:** a coluna `document` existe, sem campo na tela e sem uso.
- **Papéis:** sempre `OPERATOR_ROLES`/`MANAGER_ROLES`/`ownerScope` de `src/server/permissions.ts` e `src/server/services/scope.ts`. Nenhum array de papéis literal e nenhum `role === 'USER'` em código novo ou tocado.
- **Contrato da Server Action:** retorno `{ ok: true, data } | { ok: false, message, fieldErrors?, code? }`. Server Actions nunca lançam para o cliente; erro inesperado vira mensagem genérica e `console.error` no servidor.
- **Regra de feedback (resolve o toast duplicado):**
  - Ação disparada de um formulário: erro aparece só dentro do formulário (resumo com `role="alert"` e erros por campo); sucesso fecha o diálogo e mostra `toast.success`.
  - Ação sem formulário (remover, cancelar, desativar): erro em `toast.error`, sucesso em `toast.success`.
  - Sessão expirada: `toast.error('Sua sessão expirou. Entre novamente.')` e ida para `/login?next=<página atual>&reason=expired`, pelo mesmo `redirectToLogin` do `apiClient`.
- **Formulários com `noValidate`:** a validação que vale é a do Zod no servidor, com mensagens em pt-BR. Os dados digitados nunca se perdem quando a ação falha.
- **Componentes novos usam as primitivas de `src/components/ui` e os tokens Arena.** Nunca `text-white` (usar `text-on-accent`), nem cores hex do protótipo antigo (`#e87900`, `#218f83`, `#172036` etc.).
- **Server Components não passam funções (ícones, callbacks) para client components.** Server Actions podem ser importadas diretamente pelos client components.
- **Toda página chama `requireUser()`.** Os `loading.tsx` reproduzem o layout final da página.
- **Textos em pt-BR.** Datas exibidas como `dd/mm/aaaa`.
- **Data da prova:** o formulário envia `AAAA-MM-DD`; o servidor grava `new Date('AAAA-MM-DDT12:00:00.000Z')` (meio-dia UTC, o mesmo dia em todo o Brasil).
- **e2e:** os projetos `desktop` e `mobile` rodam em sequência no mesmo banco (resetado uma vez no `globalSetup`). Registros criados por um teste levam o nome do projeto no texto (ex.: `ATLETA NOVO desktop`), para não colidir.
- Lint, `npm test`, `npm run test:e2e` e `npm run build` verdes ao fim de cada task.

## Review Focus

1. **Erro de validação ou de servidor no meio do cadastro** (nome com 1 letra, cidade fora da lista, arena duplicada) → o diálogo continua aberto com tudo o que foi digitado, o erro aparece junto do campo e nenhum toast duplica a mensagem. Testes nas Tasks 6 e 7.
2. **Sessão expirada com o formulário aberto** → ao salvar, aviso "Sua sessão expirou" e ida para `/login?next=/atletas&reason=expired`, sem tela quebrada. Teste na Task 6.
3. **User adulterando a chamada** (id de atleta, arena ou prova de outro usuário, `ownerId` alheio, editar ou desativar um cadastro só compartilhado com ele, ou chamar uma action de compartilhamento) → "não encontrado", recusa ou o dono vira o próprio User; nada é alterado. Testes nas Tasks 4 e 9.
4. **Duplo clique em Salvar** → um único registro criado; o botão fica desabilitado e o hook ignora a segunda chamada enquanto a primeira está pendente. Testes na Task 1 (hook) e na Task 6 (e2e).
5. **Celular a 375px com nome longo** (atleta ou prova com 60+ caracteres) → sem scroll horizontal, nome truncado ou quebrado, diálogo inteiro visível. Testes nas Tasks 6 e 7.

---

### Task 1: Fundação das Server Actions e primitivas de formulário

**Files:**
- Create: `src/lib/actionResult.ts` (puro, usado no cliente e no servidor)
- Create: `src/server/services/errors.ts` (sem `server-only`)
- Create: `src/server/actions/runAction.ts` (`server-only`; não é `'use server'`, porque exporta um helper e não uma action)
- Create: `src/lib/useAction.ts` (client hook)
- Create: `src/components/ui/Dialog.tsx` e export em `src/components/ui/index.ts`
- Create: `src/components/filters/OwnerFilter.tsx` (client)
- Modify: `src/server/session.ts` (`ActionAuthError` ganha `code`)
- Modify: `src/lib/apiClient.ts` (exporta `redirectToLogin`)
- Test: `src/server/actions/runAction.test.ts`, `src/lib/useAction.test.tsx`, `src/components/ui/Dialog.test.tsx`

**Interfaces:**
- Consumes: `requireActionUser`, `ActionAuthError`, `AuthenticatedUser`, `toast`, `redirectToLogin`.
- Produces:
  - `type FieldErrors = Partial<Record<string, string[]>>`
  - `type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string; fieldErrors?: FieldErrors; code?: 'UNAUTHENTICATED' }`
  - `class DomainError extends Error { status: 400 | 404 | 409; field?: string; constructor(message: string, options?: { status?: 400 | 404 | 409; field?: string }) }` (status padrão 400) e `notFound(entity: 'Atleta' | 'Arena' | 'Prova'): DomainError` (mensagens "Atleta não encontrado.", "Arena não encontrada.", "Prova não encontrada.", status 404).
  - `ActionAuthError.code: 'UNAUTHENTICATED' | 'FORBIDDEN'` (sem sessão = `UNAUTHENTICATED`).
  - `type RevalidateTarget = string | { path: string; type: 'layout' | 'page' }`
  - `runAction<S extends z.ZodType, T>(options: { schema: S; input: unknown; revalidate: RevalidateTarget[] | ((data: T) => RevalidateTarget[]); roles?: readonly string[] }, handler: (user: AuthenticatedUser, data: z.output<S>) => Promise<T>): Promise<ActionResult<T>>`. Ordem: `requireActionUser(roles)` → `safeParse` → `handler` → `revalidatePath` de cada alvo (só no sucesso).
  - `useAction<I, T>(action: (input: I) => Promise<ActionResult<T>>, options?: { successMessage?: string | ((data: T) => string); toastErrors?: boolean }): { pending: boolean; message: string | null; fieldErrors: FieldErrors; execute: (input: I) => Promise<ActionResult<T> | null>; reset: () => void }`. Para actions com mais de um argumento, quem chama passa uma lambda: `useAction((input: X) => updateAthleteAction(id, input))`.
  - `redirectToLogin(): void`, exportado de `src/lib/apiClient.ts` sem mudar o comportamento atual.
  - `Dialog({ open, onClose, title, description?, busy?, children }: { open: boolean; onClose: () => void; title: string; description?: string; busy?: boolean; children: React.ReactNode })`: `<dialog>` modal nativo, mesmo visual do `ConfirmDialog`, `aria-labelledby` no título, botão "Fechar" (ícone `X` com `aria-label="Fechar"`). Esc, clique no fundo e "Fechar" chamam `onClose`, exceto quando `busy`. Ao fechar, o foco volta ao elemento que tinha o foco ao abrir. Largura `w-[min(36rem,calc(100vw-2rem))]`, altura máxima `calc(100dvh-2rem)` com rolagem interna.
  - `OwnerFilter({ owners, value }: { owners: Array<{ id: string; name: string | null; email: string }>; value: string })`: `<Select label="Proprietário">` com a opção "Todos os proprietários" (valor vazio); ao mudar, `router.replace` para a URL atual com `?dono=<id>` (ou sem o parâmetro), preservando os outros parâmetros.

- [ ] **Step 1: Escrever os testes que falham**

`runAction.test.ts` (mocks de `server-only`, `next/cache` e `../session`):
```ts
const schema = z.object({ name: z.string().min(2, 'Nome curto.') });
it('sem sessão devolve UNAUTHENTICATED e não chama o handler', async () => {
  requireActionUser.mockRejectedValue(new ActionAuthError('Sua sessão expirou. Entre novamente.', 'UNAUTHENTICATED'));
  const handler = vi.fn();
  expect(await runAction({ schema, input: { name: 'Zé' }, revalidate: ['/atletas'] }, handler))
    .toEqual({ ok: false, code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente.' });
  expect(handler).not.toHaveBeenCalled();
});
it('entrada inválida devolve fieldErrors e não revalida', async () => {
  const result = await runAction({ schema, input: { name: 'Z' }, revalidate: ['/atletas'] }, vi.fn());
  expect(result).toEqual({ ok: false, message: 'Revise os campos destacados.', fieldErrors: { name: ['Nome curto.'] } });
  expect(revalidatePath).not.toHaveBeenCalled();
});
it('DomainError com campo vira fieldErrors daquele campo', async () => {
  const result = await runAction({ schema, input: { name: 'Zé' }, revalidate: [] }, async () => { throw new DomainError('Já existe.', { status: 409, field: 'name' }); });
  expect(result).toEqual({ ok: false, message: 'Já existe.', fieldErrors: { name: ['Já existe.'] } });
});
it('erro inesperado vira mensagem genérica', async () => {
  const result = await runAction({ schema, input: { name: 'Zé' }, revalidate: [] }, async () => { throw new Error('db down'); });
  expect(result).toEqual({ ok: false, message: 'Não foi possível concluir a ação. Tente novamente.' });
});
it('sucesso revalida cada alvo e devolve os dados', async () => {
  const result = await runAction({ schema, input: { name: 'Zé' }, revalidate: ['/atletas', { path: '/provas/p1', type: 'layout' }] }, async (_u, data) => data.name);
  expect(result).toEqual({ ok: true, data: 'Zé' });
  expect(revalidatePath).toHaveBeenCalledWith('/atletas');
  expect(revalidatePath).toHaveBeenCalledWith('/provas/p1', 'layout');
});
```

`useAction.test.tsx` (jsdom; mocks de `sonner`/`toast` e de `redirectToLogin`):
- `segunda chamada enquanto pendente é ignorada`: a action resolve só depois de um `deferred`; duas chamadas seguidas a `execute` → a action é chamada 1 vez e a segunda devolve `null`.
- `falha de formulário guarda message e fieldErrors sem toast`: action devolve `{ ok: false, message: 'Revise os campos destacados.', fieldErrors: { name: ['Nome curto.'] } }` → `message` e `fieldErrors.name` preenchidos; `toast.error` não chamado.
- `toastErrors: true mostra toast.error`.
- `UNAUTHENTICATED mostra toast e chama redirectToLogin`.
- `sucesso mostra successMessage e limpa erros anteriores`.
- `action que rejeita (rede) vira message 'Sem conexão com o servidor. Tente novamente.'`.

`Dialog.test.tsx` (mesmo polyfill de `<dialog>` do `ConfirmDialog.test.tsx`):
- abre com o título acessível (`getByRole('dialog', { name: 'Novo atleta' })`);
- Esc e o botão "Fechar" chamam `onClose`;
- com `busy`, Esc não chama `onClose`;
- ao fechar, o foco volta ao botão que abriu.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Implementar.** `fieldErrors` da validação vêm de `z.flattenError(error).fieldErrors`. `ActionAuthError` com `code: 'FORBIDDEN'` vira `{ ok: false, message }` sem `code`.

- [ ] **Step 4: Rodar tudo**

Run: `npm run lint && npm test`
Expected: verde

- [ ] **Step 5: Commit** — `feat: fundação de server actions (runAction, useAction) e Dialog`

---

### Task 2: Compartilhamento — migration aditiva e escopo "dono ou compartilhado"

**Files:**
- Modify: `prisma/schema.prisma` (modelos `AthleteShare` e `ArenaShare`; relações de volta `shares` em `Athlete` e `Arena`, `athleteShares` e `arenaShares` em `User`)
- Create: `prisma/migrations/20261116120000_add_record_shares/migration.sql`
- Modify: `src/server/services/scope.ts` e `scope.test.ts` (`accessScope`)
- Modify: `src/server/services/raw.ts` (`findAthletesRaw` e `findArenasRaw` usam `accessScope`)
- Modify: `src/server/services/errors.ts` (status `403`)
- Modify: `prisma/seed-e2e.ts` e `e2e/fixtures/users.ts` (`TEST_SHARED_ATHLETE`)
- Modify: `src/components/ui/Dialog.tsx` e `Dialog.test.tsx`; `src/server/actions/runAction.ts` e `runAction.test.ts` (achados da revisão da Task 1)
- Create: `e2e/shares.spec.ts`

**Interfaces:**
- Consumes: `ownerScope`, `isAdmin`/`isManager`, `DomainError` (Task 1).
- Produces:
  - Prisma:
    ```prisma
    model AthleteShare {
      athleteId String
      userId    String
      createdAt DateTime @default(now())
      athlete   Athlete  @relation(fields: [athleteId], references: [id], onDelete: Cascade)
      user      User     @relation("AthleteShares", fields: [userId], references: [id], onDelete: Cascade)
      @@id([athleteId, userId])
      @@index([userId])
    }
    ```
    `ArenaShare` igual, com `arenaId` e a relação `"ArenaShares"`.
  - `accessScope(user: ScopeUser, ownerId?: string): { OR?: Array<{ ownerId: string } | { shares: { some: { userId: string } } }> }`. User → `{ OR: [{ ownerId: user.id }, { shares: { some: { userId: user.id } } }] }`, ignorando o filtro. Gerente com filtro `X` → o mesmo `OR` com `X`. Gerente sem filtro → `{}`. Serve tanto para `Athlete` quanto para `Arena`. `ownerScope` continua igual (escopo estrito).
  - `DomainError.status` passa a aceitar `403`.
  - `TEST_SHARED_ATHLETE = 'PEZEIRO B1'`: o seed de e2e compartilha esse atleta do user B com o user A. Os testes existentes continuam válidos: o user A segue sem ver `CABECEIRO B1`, e as contagens do user B não mudam.
  - `Dialog`: o clique no fundo só fecha quando o `mousedown` e o `click` acontecem ambos no próprio `<dialog>`. Assim, arrastar uma seleção de texto de um campo até o fundo não fecha o diálogo nem perde o que foi digitado.
  - `runAction`: se `revalidatePath` falhar depois de o handler ter concluído, a falha vai para `console.error` e o retorno continua `{ ok: true, data }`, porque a mutação já aconteceu.

- [ ] **Step 1: Escrever os testes que falham**

`scope.test.ts`:
```ts
const shared = (id: string) => ({ OR: [{ ownerId: id }, { shares: { some: { userId: id } } }] });
expect(accessScope({ id: 'u1', role: 'USER' }, 'u2')).toEqual(shared('u1'));
expect(accessScope({ id: 'm1', role: 'MANAGER' }, 'u2')).toEqual(shared('u2'));
expect(accessScope({ id: 'a1', role: 'ADMIN' })).toEqual({});
expect(accessScope({ id: 'v1', role: 'VIEWER' })).toEqual(shared('v1'));
```

`Dialog.test.tsx`: `mousedown dentro do campo e click no fundo não fecha` (`fireEvent.mouseDown(input)` seguido de `fireEvent.click(dialog)` → `onClose` não chamado); `mousedown e click no fundo fecham`.

`runAction.test.ts`: `falha ao revalidar depois do sucesso ainda devolve ok` (`revalidatePath` lança → `{ ok: true, data }` e `console.error` chamado).

`e2e/shares.spec.ts`:
```ts
test('user A recebe no GET /api/athletes o atleta compartilhado do B, e só ele', async ({ page }) => {
  await loginAs(page, 'userA');
  const names = (await (await page.request.get('/api/athletes')).json()).map((a: { name: string }) => a.name);
  expect(names).toContain(TEST_SHARED_ATHLETE);
  expect(names).not.toContain('CABECEIRO B1');
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL (`accessScope` inexistente; testes novos do Dialog e do runAction falham)

- [ ] **Step 3: Escrever o schema e gerar a migration sem tocar em banco com dados**

Salve o schema anterior com `git show HEAD:prisma/schema.prisma > <scratch>/schema.before.prisma` e gere o SQL com `npx prisma migrate diff --from-schema-datamodel <scratch>/schema.before.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/20261116120000_add_record_shares/migration.sql`. O SQL só pode conter `CREATE TABLE`, `CREATE INDEX` e `ALTER TABLE ... ADD CONSTRAINT` das duas tabelas novas. Depois rode `npx prisma generate` e `npm run db:local:migrate`.

- [ ] **Step 4: Implementar `accessScope`, as consultas brutas, o seed e os ajustes do Dialog e do runAction**

- [ ] **Step 5: Rodar tudo**

Run: `npm run lint && npm test && npm run test:e2e`
Expected: verde. O `globalSetup` recria o banco de testes com a migration nova.

- [ ] **Step 6: Commit** — `feat: compartilhamento de atletas e arenas (migration aditiva) e escopo dono-ou-compartilhado`

---

### Task 3: Localidades IBGE, clube, documento e notas privadas (migration aditiva)

**Files:**
- Create: `scripts/generate-ibge-localities.mjs` (busca UFs e municípios na API de localidades do IBGE e escreve os `INSERT`s; roda uma vez, à mão; não é chamado por build, teste ou runtime)
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261116130000_add_localities_club_notes/migration.sql`
- Create: `src/lib/text.ts` e `src/lib/text.test.ts`
- Create: `src/server/services/localities.ts` (sem `server-only`)
- Modify: `prisma/seed-e2e.ts` e `prisma/seed.ts` (preenchem `cityCode`)

**Interfaces:**
- Consumes: os modelos da Task 2.
- Produces:
  - Prisma (todas as colunas novas são opcionais):
    - `BrState { code Int @id; uf String @unique @db.VarChar(2); name String; municipalities Municipality[] }`
    - `Municipality { code Int @id; name String; uf String @db.VarChar(2); state BrState @relation(fields: [uf], references: [uf]); athletes Athlete[]; arenas Arena[]; @@index([uf, name]) }`
    - `Athlete` ganha `club String?`, `document String?`, `cityCode Int?` (relação `municipality`, `@@index([cityCode])`) e `notes AthleteNote[]`.
    - `Arena` ganha `cityCode Int?` (relação `municipality`, `@@index([cityCode])`).
    - `AthleteNote { athleteId String; userId String; body String; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt; @@id([athleteId, userId]); @@index([userId]) }`, com `onDelete: Cascade` para atleta e usuário (relação `"AthleteNotes"`).
  - Migration, nesta ordem:
    1. DDL gerado por `prisma migrate diff` (como na Task 2).
    2. `INSERT`s das 27 UFs e de todos os municípios devolvidos pelo IBGE (cerca de 5.570), gerados pelo script a partir de `https://servicodados.ibge.gov.br/api/v1/localidades/estados` e `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`.
    3. Backfill: `UPDATE` de `Athlete` e `Arena`, preenchendo `cityCode` quando o nome normalizado (minúsculas, sem acento via `translate`, espaços aparados) e a UF (`upper(trim(state))`) casam com exatamente um município. Os que não casam ficam com `cityCode` nulo; com `city` preenchido, a interface os mostra como "Cidade a revisar".
  - `normalizeName(value: string): string`: NFD, remove diacríticos, minúsculas, colapsa espaços, `trim`.
  - `localities.ts`:
    - `DEFAULT_UF = 'GO'` e `DEFAULT_CITY_NAME = 'Caiapônia'`.
    - `listStates(): Promise<Array<{ uf: string; name: string }>>`, por nome.
    - `listMunicipalities(uf: string): Promise<Array<{ code: number; name: string }>>`, por nome.
    - `findMunicipality(code: number): Promise<{ code: number; name: string; uf: string } | null>`.
    - `getDefaultCity(): Promise<{ code: number; name: string; uf: string }>`: procura por nome e UF; lança `Error` se a tabela não tiver Caiapônia.
  - Os seeds resolvem o `cityCode` por nome + UF. O de e2e usa Lagoa da Prata/MG e falha alto se o município não existir.

- [ ] **Step 1: Escrever os testes que falham**

`text.test.ts`:
```ts
expect(normalizeName('  João   da  CONCEIÇÃO ')).toBe('joao da conceicao');
expect(normalizeName('Caiapônia')).toBe(normalizeName('CAIAPONIA'));
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL (`src/lib/text.ts` inexistente)

- [ ] **Step 3: Escrever o script, rodá-lo uma vez e montar a migration (DDL + carga + backfill).** Aplique com `npm run db:local:migrate`.

- [ ] **Step 4: Conferir os dados no banco local de desenvolvimento**

Run: `docker exec sorteios-lagoa-db psql -U <usuário do .env.local> -d <banco de dev> -c 'select (select count(*) from "BrState") ufs, (select count(*) from "Municipality") municipios, (select code from "Municipality" where name = '"'"'Caiapônia'"'"' and uf = '"'"'GO'"'"') caiaponia;'`
Expected: `ufs = 27`, `municipios >= 5560` e um código de Caiapônia. Anote no relatório o código e quantos atletas e arenas do banco de dev casaram ou ficaram para revisão.

- [ ] **Step 5: Implementar `text.ts`, `localities.ts` e os seeds**

- [ ] **Step 6: Rodar tudo**

Run: `npm run lint && npm test && npm run test:e2e`
Expected: verde

- [ ] **Step 7: Commit** — `feat: localidades IBGE, clube, documento reservado e notas privadas de atleta`

---

### Task 4: Commands de atletas, arenas e provas; handlers `/api` delegam

**Files:**
- Create: `src/types/arenas.ts` (sai o `ArenaOption` de `src/components/EventsPage.tsx`, item adiado da fase 1)
- Create: `src/server/services/commands/owner.ts`, `athletes.ts`, `arenas.ts`, `events.ts` (sem `server-only`)
- Modify: `src/server/services/arenas.ts` (importa `ArenaOption` de `src/types/arenas.ts`; consulta própria com o dono)
- Modify: `src/server/routes/athletes/index.ts` e `[id].ts`, `src/server/routes/arenas/index.ts` e `[id].ts`, `src/server/routes/events/index.ts` e `[eventId].ts` (POST/PATCH/DELETE delegam; os Zod próprios dos handlers ficam, para manter os campos aceitos pela API; arrays de papéis viram `OPERATOR_ROLES`)
- Test: `src/server/services/commands/athletes.test.ts`, `arenas.test.ts`, `events.test.ts` (com `vi.mock('../../prisma')`)

**Interfaces:**
- Consumes: `prisma`, `ownerScope`/`eventScope`, `accessScope` (Task 2), `findMunicipality`/`normalizeName` (Task 3), `canAccessOwnerData`/`isAdmin`/`isManager`, `DomainError`/`notFound` (Task 1), `eventInclude` (`raw.ts`).
- Produces:
  - `interface ArenaOption { id: string; name: string; city: string; state: string; cityCode?: number; ownerId?: string; ownerName?: string }`
  - `resolveOwnerId(user: ScopeUser, requested?: string): Promise<string>`. User → `user.id`, sempre. Gerente → `requested ?? user.id`; se `requested` não for um usuário ativo, lança `DomainError('Proprietário inválido.', { field: 'ownerId' })`.
  - `interface AthleteData { name: string; nickname?: string | null; club?: string | null; cityCode?: number | null; phone?: string | null; email?: string | null; city?: string | null; state?: string | null; headHandicap: number; heelHandicap: number }`.
    - Com `cityCode`, o command busca o município (`findMunicipality`) e grava `cityCode`, `city` (nome) e `state` (UF). Código inexistente → `DomainError('Escolha uma cidade da lista.', { field: 'cityCode' })`.
    - Sem `cityCode` (só a API legada manda texto), grava `city`/`state` como vierem e deixa `cityCode` nulo.
  - `createAthlete(user, data: AthleteData & { ownerId?: string }): Promise<Athlete>`; `updateAthlete(user, id: string, data: Partial<AthleteData> & { ownerId?: string }): Promise<Athlete>` (`ownerId` só é aplicado para gerente); `deactivateAthlete(user, id): Promise<void>` (`active: false`). Alvo procurado com `{ id, active: true, ...accessScope(user) }`; ausente → `notFound('Atleta')`. Para **editar ou desativar**, se `!canAccessOwnerData(user.role, user.id, alvo.ownerId)` → `DomainError('Só o proprietário ou um gerente pode alterar este cadastro.', { status: 403 })`.
  - `saveAthleteNote(user, athleteId: string, body: string): Promise<void>`. O atleta precisa estar no `accessScope` (senão `notFound('Atleta')`). Faz upsert de `AthleteNote` com a chave `(athleteId, user.id)`; `body` vazio após `trim` apaga a nota.
  - `getAthleteNotes(user, athleteIds: string[]): Promise<Record<string, string>>`: só as notas do próprio usuário.
  - `findDuplicateAthletes(user, input: { name: string; cityCode: number; club?: string | null }): Promise<Array<{ id: string; name: string; city: string | null; state: string | null; club: string | null; ownerName: string | null }>>`. Busca atletas ativos com o mesmo `cityCode` dentro de `accessScope(user)` (gerente: todos) e filtra em memória por `normalizeName(name)` igual e `normalizeName(club ?? '')` igual.
  - `interface ArenaData { name: string; cityCode?: number; city?: string; state?: string }`. Mesma regra de município dos atletas: com `cityCode`, grava também `city`/`state`.
  - `createArena(user, data: ArenaData & { ownerId?: string }, tx?: Prisma.TransactionClient): Promise<{ arena: Arena; created: boolean }>`. Se já existe arena ativa do mesmo dono com o mesmo nome (sem diferenciar maiúsculas) e o mesmo `cityCode` (ou, sem código, a mesma cidade e UF em texto), devolve `{ arena: existente, created: false }`.
  - `updateArena(user, id, data: Partial<ArenaData>): Promise<Arena>`. Renomear para nome+cidade+UF de outra arena ativa do mesmo dono → `DomainError('Já existe uma arena com esse nome nessa cidade.', { status: 409, field: 'name' })`.
  - `deactivateArena(user, id): Promise<void>`. As provas que usam a arena continuam com ela; ela só some das listas de escolha. `updateArena` e `deactivateArena` procuram o alvo com `accessScope` e aplicam a mesma regra de 403 dos atletas.
  - `createEvent(user, data: { name: string; eventDate: Date; arenaId?: string; newArena?: ArenaData; ownerId?: string }): Promise<Event & EventInclude>`. Em `prisma.$transaction`: resolve o dono; com `arenaId`, a arena precisa estar ativa e no `accessScope` do usuário (arena compartilhada vale) (senão `DomainError('Arena não encontrada ou inativa.', { status: 404, field: 'arenaId' })`); sem `arenaId`, usa `createArena(..., tx)` com o mesmo dono (reaproveita a existente); cria a prova com `status: 'DRAFT'`.
  - `updateEvent(user, id, data: { name?: string; eventDate?: Date }): Promise<Event & EventInclude>`; `cancelEvent(user, id): Promise<void>` (`status: 'CANCELLED'`). Alvo procurado com `{ id, ...eventScope(user) }`; ausente → `notFound('Prova')`. Cancelar uma prova já cancelada não faz nada e não dá erro.
  - Handlers: `DomainError` vira `res.status(error.status).json({ message: error.message })`. O POST de `/api/arenas` responde 200 quando `created === false` e 201 quando cria, como hoje.

- [ ] **Step 1: Escrever os testes que falham**

`athletes.test.ts`:
```ts
it('user cria sempre para si, mesmo pedindo outro dono', async () => {
  await createAthlete({ id: 'u1', role: 'USER' }, { ...data, ownerId: 'u2' });
  expect(prisma.athlete.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: 'u1' }) }));
  expect(prisma.user.findFirst).not.toHaveBeenCalled();
});
it('gerente com dono inexistente recebe erro no campo ownerId', async () => {
  prisma.user.findFirst.mockResolvedValue(null);
  await expect(createAthlete({ id: 'm1', role: 'MANAGER' }, { ...data, ownerId: 'x' }))
    .rejects.toMatchObject({ message: 'Proprietário inválido.', field: 'ownerId' });
});
it('user não altera atleta de outro (404)', async () => {
  prisma.athlete.findFirst.mockResolvedValue(null);
  await expect(updateAthlete({ id: 'u1', role: 'USER' }, 'a-do-u2', { name: 'Novo' })).rejects.toMatchObject({ status: 404, message: 'Atleta não encontrado.' });
  expect(prisma.athlete.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'a-do-u2', active: true, OR: [{ ownerId: 'u1' }, { shares: { some: { userId: 'u1' } } }] } }));
  expect(prisma.athlete.update).not.toHaveBeenCalled();
});
it('user não troca o dono ao editar', async () => { /* ownerId: 'u2' no input → update sem ownerId */ });
it('desativar marca active=false', async () => { /* update com { active: false } */ });
it('usuário com quem o atleta foi compartilhado não edita nem desativa (403)', async () => {
  prisma.athlete.findFirst.mockResolvedValue({ id: 'a1', ownerId: 'u2' });
  const denied = { status: 403, message: 'Só o proprietário ou um gerente pode alterar este cadastro.' };
  await expect(updateAthlete({ id: 'u1', role: 'USER' }, 'a1', { name: 'Novo nome' })).rejects.toMatchObject(denied);
  await expect(deactivateAthlete({ id: 'u1', role: 'USER' }, 'a1')).rejects.toMatchObject(denied);
  expect(prisma.athlete.update).not.toHaveBeenCalled();
});
it('usuário compartilhado grava a própria nota', async () => { /* findFirst devolve atleta de u2; saveAthleteNote(u1, 'a1', ' obs ') → athleteNote.upsert com where athleteId_userId { a1, u1 } e body 'obs' */ });
it('nota vazia apaga', async () => { /* body '  ' → athleteNote.deleteMany({ where: { athleteId: 'a1', userId: 'u1' } }) */ });
it('com cityCode grava cidade e UF do município', async () => { /* findMunicipality mock → { code: 5204300, name: 'Caiapônia', uf: 'GO' }; create com cityCode, city 'Caiapônia', state 'GO' (valores do mock, não o código real) */ });
it('cityCode inexistente → erro no campo cityCode', async () => { /* findMunicipality → null */ });
it('duplicados ignoram acento e caixa e respeitam o escopo', async () => {
  prisma.athlete.findMany.mockResolvedValue([{ id: 'a9', name: 'JOÃO SILVA', club: 'Haras X', city: 'Caiapônia', state: 'GO', owner: { name: 'User A' } }, { id: 'a8', name: 'João Silva', club: 'Outro', city: 'Caiapônia', state: 'GO', owner: null }]);
  const found = await findDuplicateAthletes({ id: 'u1', role: 'USER' }, { name: 'joao silva', cityCode: 1, club: 'haras x' });
  expect(found.map((a) => a.id)).toEqual(['a9']);
  expect(prisma.athlete.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ active: true, cityCode: 1, OR: [{ ownerId: 'u1' }, { shares: { some: { userId: 'u1' } } }] }) }));
});
```

`arenas.test.ts`:
- `arena duplicada do mesmo dono é reaproveitada` → `{ created: false }` e `arena.create` não chamado; o `findFirst` usa `mode: 'insensitive'` em nome e cidade.
- `renomear para nome de outra arena ativa → DomainError 409 no campo name`.
- `user não desativa arena de outro (404 'Arena não encontrada.')`.

`events.test.ts`:
- `prova com arena nova cria a arena com o mesmo dono dentro da transação` (`$transaction` mockado chamando o callback com um `tx` falso; `tx.arena.create` com `ownerId` do dono resolvido; `tx.event.create` com `status: 'DRAFT'` e `createdById` do dono).
- `user não usa arena de outro` → `DomainError` status 404 com `field: 'arenaId'`.
- `user não cancela prova de outro (404 'Prova não encontrada.')`.
- `cancelar prova já cancelada não chama update`.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Implementar os commands e fazer os handlers delegarem.** Depois, rode `grep -rn "'USER'" src/server/routes/athletes src/server/routes/arenas src/server/routes/events/index.ts "src/server/routes/events/[eventId].ts"`; não pode sobrar nada.

- [ ] **Step 4: Rodar tudo**

Run: `npm run lint && npm test && npm run test:e2e`
Expected: verde. As telas ainda usam a API; os e2e da fase 1 provam que o contrato de `/api` não mudou.

- [ ] **Step 5: Commit** — `refactor: commands de atletas, arenas e provas com ownership; /api delega`

---

### Task 5: Schemas Zod e Server Actions dos cadastros

**Files:**
- Create: `src/lib/schemas/cadastros.ts` (puro)
- Create: `src/server/actions/athletes.ts`, `arenas.ts`, `events.ts` (`'use server'`)
- Modify: `src/lib/mappers.ts` (`toCompetitor` passa a mapear `apelido` e `estado`; `toEventSummary` ganha `isoDate`) e `src/types/roping.ts`/`src/types/events.ts`
- Test: `src/lib/schemas/cadastros.test.ts`, `src/server/actions/actions.test.ts`, `src/lib/mappers.test.ts` (casos novos)

**Interfaces:**
- Consumes: `runAction` (Task 1), commands (Task 4), `toCompetitor`, `toEventSummary`.
- Produces:
  - Em `src/types/roping.ts`, `Competitor` ganha `estado?: string`, `clube?: string`, `cityCode?: number` e `cityNeedsReview?: boolean` (`true` quando há `city` em texto e `cityCode` é nulo). `PersistedAthlete` ganha `nickname`, `state`, `club` e `cityCode` (todos opcionais e anuláveis).
  - Em `src/types/events.ts`, `EventSummary` ganha `isoDate: string` (`AAAA-MM-DD`, calculado em UTC).
  - Schemas (strings vazias ou só com espaços viram `undefined` antes da validação):

| Schema | Campo | Regra e mensagem |
|---|---|---|
| `athleteSchema` | `name` | trim, 2–120: "Informe o nome com pelo menos 2 letras." / "Use no máximo 120 caracteres." |
| | `nickname` | opcional, até 80 |
| | `club` | opcional, até 80 |
| | `cityCode` | obrigatório, inteiro positivo (aceita string numérica): "Escolha uma cidade da lista." |
| | `headHandicap`, `heelHandicap` | obrigatório ("Informe o handicap."), número 0–10 ("O handicap vai de 0 a 10."), múltiplo de 0,5 ("Use múltiplos de 0,5."); aceita string numérica com vírgula ou ponto |
| `arenaSchema` | `name` | trim, 2–120: "Informe o nome da arena." |
| | `cityCode` | mesma regra do atleta |
| `eventSchema` | `name` | trim, 3–160: "Informe o nome da prova (mínimo 3 letras)." |
| | `eventDate` | `AAAA-MM-DD` e data real: "Informe uma data válida." |
| | `arenaId` | opcional |
| | `arenaName`, `cityCode` | obrigatórios só sem `arenaId` (`superRefine` com `path` de cada campo); mensagens do `arenaSchema` |
| `eventUpdateSchema` | `name`, `eventDate` | as mesmas regras, ambos obrigatórios |
| `athleteNoteSchema` | `body` | até 2000: "Use no máximo 2000 caracteres." (vazio é permitido e apaga) |
| `duplicateCheckSchema` | `name`, `cityCode`, `club` | as mesmas regras do `athleteSchema` |
| `ufSchema` | — | `/^[A-Z]{2}$/` |

  - Nenhum schema tem `ownerId`: as actions sempre criam para o próprio usuário (spec 6.9). Chaves desconhecidas são descartadas pelo Zod.
  - Tipos de entrada: `AthleteFormInput = z.input<typeof athleteSchema>`, `ArenaFormInput`, `EventFormInput`, `EventUpdateInput`.
  - Actions (todas via `runAction`; ids validados com `z.string().min(1)`):

| Action | Retorno | Revalida |
|---|---|---|
| `createAthleteAction(input: AthleteFormInput)` | `ActionResult<Competitor>` | `/atletas`, `/`, `/sorteio-avulso` |
| `updateAthleteAction(id: string, input: AthleteFormInput)` | `ActionResult<Competitor>` | idem |
| `deactivateAthleteAction(id: string)` | `ActionResult<null>` | idem |
| `createArenaAction(input: ArenaFormInput)` | `ActionResult<ArenaOption>` | `/provas` |
| `updateArenaAction(id: string, input: ArenaFormInput)` | `ActionResult<ArenaOption>` | `/provas` |
| `deactivateArenaAction(id: string)` | `ActionResult<null>` | `/provas` |
| `saveAthleteNoteAction(athleteId: string, input: { body: string })` | `ActionResult<null>` | `/atletas` |
| `checkAthleteDuplicatesAction(input)` | `ActionResult<DuplicateCandidate[]>` (o retorno de `findDuplicateAthletes`) | nada |
| `listMunicipalitiesAction(uf: string)` | `ActionResult<Array<{ code: number; name: string }>>` | nada |
| `createEventAction(input: EventFormInput)` | `ActionResult<{ id: string }>` | `/provas`, `/agenda`, `/` |
| `updateEventAction(id: string, input: EventUpdateInput)` | `ActionResult<EventSummary>` | idem + `{ path: '/provas/<id>', type: 'layout' }` |
| `cancelEventAction(id: string)` | `ActionResult<null>` | idem ao update |

  - `createArenaAction` com `created === false` devolve `{ ok: false, message: 'Já existe uma arena com esse nome nessa cidade.', fieldErrors: { name: [mesma mensagem] } }` e não revalida.

- [ ] **Step 1: Escrever os testes que falham**

`cadastros.test.ts`:
```ts
expect(athleteSchema.safeParse({ name: 'Zé', headHandicap: '2,5', heelHandicap: 3 }).data).toMatchObject({ headHandicap: 2.5, heelHandicap: 3 });
expect(flat(athleteSchema, { name: 'Z', headHandicap: '', heelHandicap: 2.3, state: 'Minas' })).toEqual({
  name: ['Informe o nome com pelo menos 2 letras.'],
  headHandicap: ['Informe o handicap.'],
  heelHandicap: ['Use múltiplos de 0,5.'],
  state: ['Use a sigla do estado, ex.: MG.'],
});
expect(athleteSchema.parse({ name: 'Zé', headHandicap: 1, heelHandicap: 1, city: '   ' }).city).toBeUndefined();
expect(flat(eventSchema, { name: 'Copa', eventDate: '2026-02-30' })).toMatchObject({
  eventDate: ['Informe uma data válida.'], arenaName: ['Informe o nome da arena.'], city: ['Informe a cidade.'],
});
expect(eventSchema.safeParse({ name: 'Copa', eventDate: '2026-12-05', arenaId: 'a1' }).success).toBe(true);
```
(`flat` é um helper local que devolve `z.flattenError(result.error).fieldErrors`.)

`actions.test.ts` (mocks de `server-only`, `next/cache`, `../session` e dos commands):
- `createAthleteAction devolve o Competitor mapeado e revalida /atletas, / e /sorteio-avulso`.
- `createEventAction converte a data para meio-dia UTC`: o command recebe `eventDate` igual a `new Date('2026-12-05T12:00:00.000Z')` e `newArena` igual a `{ name: arenaName, cityCode }` quando não há `arenaId`.
- `createArenaAction com arena existente devolve erro no campo name`.
- `cancelEventAction revalida o layout da prova`.

`mappers.test.ts`: `toEventSummary` de uma prova em `2026-12-05T12:00:00Z` dá `isoDate: '2026-12-05'` e `date: '05/12/2026'`; `toCompetitor` mapeia `nickname` para `apelido` e `state` para `estado`.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: Implementar os schemas, os mapeadores e as actions**

- [ ] **Step 4: Rodar tudo**

Run: `npm run lint && npm test && npm run build`
Expected: verde

- [ ] **Step 5: Commit** — `feat: schemas zod e server actions de atletas, arenas e provas`

---

### Task 6: Tela de atletas (e cadastro rápido do sorteio avulso)

**Files:**
- Modify: `app/(app)/atletas/page.tsx` (lê `searchParams.dono`; `PageHeader` com a ação "Novo atleta")
- Modify: `app/(app)/atletas/loading.tsx`
- Create: `src/components/athletes/AthletesView.tsx` (client: busca, lista, editar, remover, empty states)
- Create: `src/components/athletes/AthleteFormDialog.tsx` (client: criar e editar)
- Create: `src/components/athletes/NewAthleteButton.tsx` (client: botão do `PageHeader` que abre o diálogo)
- Create: `src/components/locations/CityPicker.tsx` (client; reaproveitado pela Task 7)
- Create: `src/components/athletes/AthleteNotesDialog.tsx` (client)
- Modify: `app/(app)/sorteio-avulso/QuickDrawClient.tsx` (usa `AthleteFormDialog` no lugar do `NewCompetitorModal` e do POST em `/api/athletes`)
- Delete: `app/(app)/atletas/AthletesClient.tsx`, `src/components/AthletesPage.tsx`, `src/components/NewCompetitorModal.tsx`
- Create: `e2e/athletes.spec.ts`
- Test: `src/components/athletes/AthleteFormDialog.test.tsx`, `src/components/locations/CityPicker.test.tsx`

**Interfaces:**
- Consumes: `listAthletes(user, { ownerId })` (já com `accessScope`, Task 2), `getAthleteNotes`, `listStates`/`getDefaultCity` (Task 3), `listOwners`, actions de atleta, de notas, de duplicados e de municípios (Task 5), `useAction`, `Dialog`, `OwnerFilter`, `useConfirm`, `EmptyState`, `TEST_SHARED_ATHLETE`.
- Produces:
  - `CityPicker({ states, defaultUf, defaultCity, error, hint }: { states: Array<{ uf: string; name: string }>; defaultUf: string; defaultCity?: { code: number; name: string }; error?: string; hint?: string })`.
    - `Select` "UF" (sigla + nome) e um `Input` "Cidade" com `list` apontando para um `<datalist>` dos municípios da UF, carregados por `listMunicipalitiesAction(uf)` e guardados em cache por UF no componente.
    - Guarda o código num `<input type="hidden" name="cityCode">` e expõe `value`/`onChange` (`{ uf: string; cityCode: number | null; cityName: string }`) para formulários controlados.
    - Trocar a UF limpa a cidade. O texto digitado só vira código quando bate exatamente, sem diferenciar acento e caixa (`normalizeName`), com um município da UF; senão, `cityCode` fica `null` e o servidor responde "Escolha uma cidade da lista.".
  - `AthleteFormDialog({ open, onClose, athlete?, states, defaultCity, onSaved?, onUseExisting? }: { open: boolean; onClose: () => void; athlete?: Competitor; states: State[]; defaultCity: { code: number; name: string; uf: string }; onSaved?: (athlete: Competitor) => void; onUseExisting?: (athleteId: string) => void })`.
    - Título "Novo atleta" ou "Editar atleta".
    - Campos, todos com `Input`/`Select` e rótulo: "Nome", "Apelido", "Clube", o `CityPicker` ("UF" e "Cidade"), "Handicap de cabeceiro" e "Handicap de pezeiro" (`inputMode="decimal"`, padrão `2.5` ao criar). Sem campo de proprietário nem de documento.
    - Na criação, o `CityPicker` começa na cidade padrão (`defaultCity`, prop vinda da página: GO/Caiapônia, lida da tabela). Na edição, começa no `cityCode` do atleta; se o atleta estiver com "Cidade a revisar", começa vazio e mostra a dica "Cidade anterior: <texto>".
    - **Aviso de duplicado** (só na criação): ao clicar em "Salvar atleta", chama primeiro `checkAthleteDuplicatesAction`. Se houver candidatos, mostra dentro do diálogo um bloco `role="alert"` com o título "Possível atleta já cadastrado", a lista "<nome> · <cidade>/<UF> · <clube>" (+ "de <dono>" para gerente) e os botões "Usar o existente" (fecha o diálogo e chama `onUseExisting(id)`) e "Cadastrar mesmo assim" (chama `createAthleteAction`). Sem candidatos, cria direto. A verificação nunca bloqueia: se ela falhar, o cadastro segue. O botão fica desabilitado durante a verificação e a criação, para o duplo clique não gerar dois cadastros.
    - Botões "Cancelar" e "Salvar atleta" (`loading` enquanto pendente).
    - O estado do formulário só é limpo depois de um sucesso; numa falha, tudo o que foi digitado continua no lugar.
    - Sucesso: `toast.success('Atleta cadastrado.')` ou `toast.success('Atleta atualizado.')`, chama `onSaved` e fecha.
  - `AthletesView({ athletes, notes, owners, canFilterOwners, ownerFilter, currentUserId, states, defaultCity })`.
    - Barra com a busca (`Input` com rótulo "Buscar atleta", filtra no cliente por nome, apelido e cidade, sem diferenciar acentos) e o `OwnerFilter` para gerente.
    - Contagem: "N atletas" (ou "1 atleta").
    - Lista única, sem marcação duplicada para desktop e mobile: no `md+`, linhas em grade com o cabeçalho Nome · Cidade · HC cab. · HC pé · [Proprietário] · Ações; no mobile, as mesmas linhas empilhadas. Cada linha é um `<li>` com o nome em `truncate`.
    - Atleta de outro dono, visto por um User porque foi compartilhado (`athlete.ownerId !== currentUserId` e o usuário não é gerente): a linha mostra o `Badge` "Compartilhado" e o texto "por <ownerName>", e **não tem Editar nem Remover**.
    - A coluna Cidade mostra "<cidade>/<UF>" e o clube logo abaixo; com `cityNeedsReview`, mostra o `Badge` "Cidade a revisar" (tom `warning`).
    - Ações por linha: botões de ícone com `aria-label="Notas de <nome>"` (em todas as linhas; indica com um ponto quando já há nota), `aria-label="Editar <nome>"` e `aria-label="Remover <nome>"`.
    - `AthleteNotesDialog({ open, onClose, athlete, initialBody })`: título "Notas sobre <nome>", texto "Só você vê estas notas.", `textarea` com o rótulo "Notas" e botão "Salvar notas", via `saveAthleteNoteAction`, com o sucesso "Notas salvas.". As notas vêm de `getAthleteNotes` na página (prop `notes: Record<string, string>`).
    - "Usar o existente" no diálogo de cadastro preenche a busca com o nome do atleta escolhido.
    - Remover usa `useConfirm` (título "Remover o atleta?"; descrição "<nome> sai da lista de atletas. Inscrições e sorteios já feitos não mudam."; botão "Remover atleta"; tom `danger`), depois `deactivateAthleteAction` com `toastErrors: true` e o sucesso "Atleta removido.".
    - Empty states: sem atletas, "Nenhum atleta cadastrado", com o botão "Cadastrar atleta"; busca sem resultado, "Nenhum atleta encontrado", com o botão "Limpar busca".
  - Skeleton: cabeçalho, barra de filtros e 6 linhas na mesma grade.

- [ ] **Step 1: Escrever os testes que falham**

`AthleteFormDialog.test.tsx` (mock de `../../server/actions/athletes`):
- `falha mantém os dados e mostra o erro do campo, sem toast`: a action devolve `{ ok: false, message: 'Revise os campos destacados.', fieldErrors: { name: ['Informe o nome com pelo menos 2 letras.'] } }` → o campo "Nome" mantém o valor digitado, tem `aria-invalid="true"` e o texto do erro; o diálogo segue aberto; `toast.error` não é chamado.
- `sucesso chama onSaved e onClose`.
- `edição abre preenchida com os dados do atleta`.
- `duplicado mostra o aviso e "Cadastrar mesmo assim" cria`: `checkAthleteDuplicatesAction` devolve 1 candidato → o aviso aparece, `createAthleteAction` ainda não foi chamada; o clique em "Cadastrar mesmo assim" a chama uma vez.
- `"Usar o existente" chama onUseExisting com o id e fecha`.

`CityPicker.test.tsx` (mock de `listMunicipalitiesAction`): começa com GO e Caiapônia (props); trocar para MG limpa a cidade e carrega a lista de MG; digitar "lagoa da prata" (minúsculas, sem acento) resolve para o código do município da lista mockada; texto fora da lista deixa `cityCode` nulo.

`e2e/athletes.spec.ts` (todos os testes nos dois projetos; `suffix = testInfo.project.name`):
```ts
test('cria, edita e remove um atleta', async ({ page }, testInfo) => {
  const name = `ATLETA NOVO ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Handicap de cabeceiro').fill('3');
  await expect(dialog.getByLabel('UF')).toHaveValue('GO');
  await expect(dialog.getByLabel('Cidade')).toHaveValue('Caiapônia');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).dblclick();
  await expect(page.getByText('Atleta cadastrado.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toHaveCount(1);
  await page.getByRole('button', { name: `Editar ${name}` }).click();
  await page.getByRole('dialog', { name: 'Editar atleta' }).getByLabel('Cidade').fill('Rio Verde');
  await page.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: name })).toContainText('Rio Verde/GO');
  await page.getByRole('button', { name: `Remover ${name}` }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remover atleta' }).click();
  await expect(page.getByText(name)).toHaveCount(0);
});
test('erro de validação mantém o que foi digitado', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill('Z');
  await dialog.getByLabel('Clube').fill('Haras Lagoa');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(dialog.getByText('Informe o nome com pelo menos 2 letras.')).toBeVisible();
  await expect(dialog.getByLabel('Clube')).toHaveValue('Haras Lagoa');
  await expect(dialog.getByLabel('Cidade')).toHaveValue('Caiapônia');
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});
test('sessão expirada ao salvar leva ao login com next', async ({ page, context }) => { /* abre o diálogo, preenche, clearCookies, salva → toHaveURL(/\/login\?next=%2Fatletas&reason=expired/) */ });
test('busca sem resultado mostra empty state e limpa', async ({ page }) => { /* "zzz" → 'Nenhum atleta encontrado' → 'Limpar busca' → CABECEIRO A1 visível */ });
test('nome longo não cria scroll horizontal', async ({ page }, testInfo) => { /* cria atleta com 70 caracteres + suffix; hasNoHorizontalScroll === true */ });
test('manager filtra por proprietário pela URL', async ({ page }) => {
  await loginAs(page, 'manager');
  await page.goto('/atletas');
  await page.getByLabel('Proprietário').selectOption({ label: 'User B Teste' });
  await expect(page).toHaveURL(/dono=/);
  await expect(page.getByText('CABECEIRO B1')).toBeVisible();
  await expect(page.getByText('CABECEIRO A1')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('CABECEIRO A1')).toHaveCount(0);
});
```
```ts
test('atleta compartilhado aparece para o user A, editável e sem remover', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  const row = page.getByRole('listitem').filter({ hasText: TEST_SHARED_ATHLETE });
  await expect(row).toContainText('Compartilhado');
  await expect(row).toContainText('User B Teste');
  await expect(page.getByRole('button', { name: `Editar ${TEST_SHARED_ATHLETE}` })).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Remover ${TEST_SHARED_ATHLETE}` })).toHaveCount(0);
});
test('notas são privadas e persistem', async ({ page }, testInfo) => {
  const note = `Laça bem de cabeça ${testInfo.project.name}`;
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: `Notas de ${TEST_SHARED_ATHLETE}` }).click();
  await page.getByRole('dialog').getByLabel('Notas').fill(note);
  await page.getByRole('button', { name: 'Salvar notas' }).click();
  await expect(page.getByText('Notas salvas.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: `Notas de ${TEST_SHARED_ATHLETE}` }).click();
  await expect(page.getByRole('dialog').getByLabel('Notas')).toHaveValue(note);
  await loginAs(page, 'userB');
  await page.goto('/atletas');
  await page.getByRole('button', { name: `Notas de ${TEST_SHARED_ATHLETE}` }).click();
  await expect(page.getByRole('dialog').getByLabel('Notas')).toHaveValue('');
});
test('aviso de possível duplicado sem bloquear', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await page.getByRole('button', { name: 'Novo atleta' }).click();
  const dialog = page.getByRole('dialog', { name: 'Novo atleta' });
  await dialog.getByLabel('Nome').fill('cabeceiro a1'); // mesmo nome do seed, em outra caixa
  await dialog.getByLabel('UF').selectOption('MG');
  await dialog.getByLabel('Cidade').fill('Lagoa da Prata');
  await dialog.getByRole('button', { name: 'Salvar atleta' }).click();
  await expect(dialog.getByText('Possível atleta já cadastrado')).toBeVisible();
  await dialog.getByRole('button', { name: 'Usar o existente' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Buscar atleta')).toHaveValue('CABECEIRO A1');
});
test('o user B não recebe aviso de duplicado de atleta do A', async ({ page }) => { /* userB cria "Cabeceiro A1" em MG/Lagoa da Prata → nenhum aviso, toast 'Atleta cadastrado.' */ });
```
Ajuste também `e2e/quick-draw.spec.ts`: um teste novo abre o cadastro rápido do sorteio avulso, cria `ATLETA AVULSO <projeto>` e confere que ele aparece na lista de disponíveis sem recarregar a página.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test && npx playwright test e2e/athletes.spec.ts --project=desktop`
Expected: FAIL

- [ ] **Step 3: Implementar a página, os componentes e a troca no sorteio avulso; apagar os arquivos antigos.** Antes de apagar, `grep -rn "AthletesPage\|NewCompetitorModal\|AthletesClient" app src e2e` não pode retornar nada fora dos arquivos apagados.

- [ ] **Step 4: Rodar tudo**

Run: `npm run lint && npm test && npm run test:e2e`
Expected: verde

- [ ] **Step 5: Commit** — `feat: tela de atletas com server actions, edição e cadastro rápido no sorteio avulso`

---

### Task 7: Tela de provas e arenas

**Files:**
- Modify: `app/(app)/provas/(lista)/page.tsx` (lê `searchParams.dono` e `searchParams.canceladas`; `PageHeader` com a ação "Nova prova")
- Modify: `app/(app)/provas/(lista)/loading.tsx`
- Create: `src/components/events/EventStatusBadge.tsx` (server-safe; recebe o rótulo de `EventSummary['status']`; o mapa `DB_STATUS` sai de `app/(app)/provas/[eventId]/layout.tsx`, que passa a usar este componente)
- Create: `src/components/events/EventsView.tsx` (client: lista de provas, editar, cancelar)
- Create: `src/components/events/EventFormDialog.tsx` (client: criar e editar)
- Create: `src/components/events/NewEventButton.tsx` (client)
- Create: `src/components/arenas/ArenasPanel.tsx` e `ArenaFormDialog.tsx` (client)
- Delete: `app/(app)/provas/(lista)/EventsClient.tsx`, `src/components/EventsPage.tsx`
- Modify: `e2e/fixtures/users.ts` e `prisma/seed-e2e.ts` (`TEST_ARENAS`)
- Modify: `e2e/sections.spec.ts` (o seletor `/cancelar/i` vira `getByRole('button', { name: \`Cancelar ${TEST_EVENTS.userB}\` })`, item adiado)
- Create: `e2e/events.spec.ts`
- Test: `src/components/events/EventFormDialog.test.tsx`

**Interfaces:**
- Consumes: `CityPicker` (Task 6), `listStates`/`getDefaultCity` (Task 3), `listEvents(user, { ownerId })`, `listArenas(user, { ownerId })`, `listOwners`, actions de provas e arenas (Task 5), `useAction`, `Dialog`, `OwnerFilter`, `useConfirm`.
- Produces:
  - Layout: no `xl`, duas colunas (`xl:grid-cols-[minmax(0,1fr)_22rem]`), com as provas à esquerda e `ArenasPanel` à direita; abaixo do `xl`, as arenas vêm depois das provas.
  - `EventsView({ events, arenas, owners, canFilterOwners, ownerFilter, showCancelled })`.
    - Cada prova é um `<article>` com o nome em `h2` (quebra linha, sem estourar), a data, a arena, o `EventStatusBadge`, "N inscritos" e, para gerente, "Proprietário: <nome>".
    - Ações: link "Detalhes" para `/provas/<id>` (os e2e da fase 1 dependem de `article` + link "Detalhes"); botões de ícone `aria-label="Editar <nome>"` e `aria-label="Cancelar <nome>"`, ambos ocultos em prova cancelada.
    - As provas canceladas ficam fora da lista por padrão. Um link-botão "Mostrar canceladas" / "Ocultar canceladas" alterna `?canceladas=1`, preservando `dono`.
    - Cancelar usa `useConfirm` com o texto atual ("Cancelar a prova?", `A prova "<nome>" será marcada como cancelada.`, "Cancelar prova", "Manter prova", `danger`), depois `cancelEventAction` com `toastErrors: true` e o sucesso "Prova cancelada.".
    - Empty states: sem provas, "Nenhuma prova cadastrada", com o botão "Cadastrar prova"; com canceladas ocultas e nenhuma ativa, "Nenhuma prova ativa", com o link "Mostrar canceladas".
  - `EventFormDialog({ open, onClose, event?, arenas, states, defaultCity })`.
    - Título "Nova prova" ou "Editar prova".
    - Campos: "Nome da prova" e "Data" (`type="date"`, preenchido com `isoDate` na edição). Sem campo de proprietário; o responsável é trocado em `/cadastros`.
    - Na criação há ainda o `Select` "Arena", com a primeira opção "Cadastrar nova arena" seguida das arenas `nome · cidade/UF`. Com "Cadastrar nova arena", aparecem "Nome da nova arena" e o `CityPicker` (Task 6), começando em GO/Caiapônia.
    - Na edição, a arena aparece só como texto ("Arena: <nome>"); ela não muda nesta fase.
    - Botão "Salvar prova". Sucesso: "Prova criada." ou "Prova atualizada.".
  - `ArenasPanel({ arenas, canSeeOwners, currentUserId, states, defaultCity })`.
    - Título "Arenas", botão "Nova arena" e a lista `nome` + `cidade/UF` (+ dono para gerente).
    - Botões `aria-label="Editar <nome>"` e `aria-label="Desativar <nome>"`. Arena compartilhada com um User (dono diferente) mostra "Compartilhada" e não tem Editar nem Desativar. Arena com cidade sem código mostra "Cidade a revisar".
    - Desativar pede confirmação ("Desativar a arena?"; "<nome> deixa de aparecer na escolha de arenas. Provas já cadastradas continuam com ela."; "Desativar arena").
    - Empty state: "Nenhuma arena cadastrada".
  - `ArenaFormDialog`: título "Nova arena" ou "Editar arena"; campos "Nome" e o `CityPicker` (GO/Caiapônia na criação); botão "Salvar arena"; sucesso "Arena cadastrada." ou "Arena atualizada.".
  - Skeleton: cabeçalho, 3 cartões de prova e, no `xl`, a coluna de arenas.

- [ ] **Step 1: Escrever os testes que falham**

`EventFormDialog.test.tsx` (mock das actions):
- `com arena existente esconde os campos de nova arena`.
- `erro do servidor aparece só no formulário`: a action devolve `{ ok: false, message: 'Arena não encontrada ou inativa.', fieldErrors: { arenaId: [...] } }` → o texto aparece no diálogo; `toast.error` não é chamado; os campos mantêm os valores (item adiado do toast duplicado).
- `edição mostra a arena como texto e envia só nome e data`.

`e2e/events.spec.ts`:
```ts
test('cria prova com arena nova e depois reaproveita a arena', async ({ page }, testInfo) => {
  const s = testInfo.project.name;
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova prova' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova prova' });
  await dialog.getByLabel('Nome da prova').fill(`COPA NOVA ${s}`);
  await dialog.getByLabel('Data').fill('2026-12-20');
  await dialog.getByLabel('Nome da nova arena').fill(`ARENA NOVA ${s}`);
  await dialog.getByLabel('UF').selectOption('MG');
  await dialog.getByLabel('Cidade').fill('Arcos');
  await dialog.getByRole('button', { name: 'Salvar prova' }).click();
  await expect(page.getByText('Prova criada.')).toBeVisible();
  const card = page.getByRole('article').filter({ hasText: `COPA NOVA ${s}` });
  await expect(card).toContainText('20/12/2026');
  await expect(card).toContainText(`ARENA NOVA ${s}`);
  await page.getByRole('button', { name: 'Nova prova' }).click();
  await expect(page.getByRole('dialog', { name: 'Nova prova' }).getByLabel('Arena')).toContainText(`ARENA NOVA ${s} · Arcos/MG`);
});
test('edita a data da prova', async ({ page }, testInfo) => { /* cria COPA EDIT <s> com a arena do seed; editar → data 2026-12-21 → card mostra 21/12/2026 */ });
test('cancela prova com confirmação; ela some e volta com "Mostrar canceladas"', async ({ page }, testInfo) => { /* cria COPA CANCEL <s>; Cancelar → Esc mantém; Cancelar → "Cancelar prova" → some; "Mostrar canceladas" → aparece com badge Cancelada e sem botão Editar */ });
test('arena duplicada mostra erro no campo e mantém o formulário', async ({ page }) => {
  await loginAs(page, 'userA');
  await page.goto('/provas');
  await page.getByRole('button', { name: 'Nova arena' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nova arena' });
  await dialog.getByLabel('Nome').fill(TEST_ARENAS.userA);
  await dialog.getByLabel('UF').selectOption('MG');
  await dialog.getByLabel('Cidade').fill('Lagoa da Prata');
  await dialog.getByRole('button', { name: 'Salvar arena' }).click();
  await expect(dialog.getByText('Já existe uma arena com esse nome nessa cidade.')).toBeVisible();
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
});
test('cria, renomeia e desativa uma arena', async ({ page }, testInfo) => { /* ARENA PAINEL <s> → editar → ARENA PAINEL RENOMEADA <s> → desativar → some da lista e do Select "Arena" */ });
test('prova com nome longo não cria scroll horizontal', async ({ page }, testInfo) => { /* nome com 80 caracteres; hasNoHorizontalScroll === true */ });
```
Exporte `TEST_ARENAS = { userA: 'ARENA E2E A', userB: 'ARENA E2E B' }` de `e2e/fixtures/users.ts` e use-o no `prisma/seed-e2e.ts` no lugar das strings literais.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test && npx playwright test e2e/events.spec.ts --project=desktop`
Expected: FAIL

- [ ] **Step 3: Implementar a página, os componentes e o badge; apagar os arquivos antigos.** Depois, `grep -rn "EventsPage\|EventsClient" app src e2e` não pode retornar nada.

- [ ] **Step 4: Rodar tudo**

Run: `npm run lint && npm test && npm run test:e2e`
Expected: verde, incluindo `event-routes.spec.ts`, `contrast.spec.ts` (`/provas` precisa ter algum `.bg-accent` visível, que o botão "Nova prova" garante) e `smoke.spec.ts`.

- [ ] **Step 5: Commit** — `feat: provas e arenas com server actions, diálogos e filtro de canceladas`

---

### Task 8: Agenda e painel com filtro por dono no servidor

**Files:**
- Modify: `app/(app)/agenda/page.tsx` e `loading.tsx`
- Create: `src/components/events/AgendaList.tsx` (Server Component, sem `'use client'`)
- Create: `src/lib/agenda.ts` (puro) e `src/lib/agenda.test.ts`
- Modify: `app/(app)/(painel)/page.tsx` e `src/components/Dashboard.tsx` (lê `searchParams.dono`; `listAthletes` e `listEvents` recebem o mesmo `ownerId`; sai o estado local de dono e entra o `OwnerFilter`; o item adiado da contagem de atletas sem filtro se resolve aqui)
- Delete: `src/components/AgendaPage.tsx`
- Create: `e2e/agenda.spec.ts`

**Interfaces:**
- Consumes: `listEvents`, `listAthletes`, `listOwners`, `OwnerFilter`, `EventStatusBadge`, `EmptyState`.
- Produces:
  - `splitAgenda(events: EventSummary[], today: string): { upcoming: EventSummary[]; past: EventSummary[] }`, com `today` em `AAAA-MM-DD`. Ignora as canceladas. Em `upcoming` ficam as de `isoDate >= today`, da mais próxima para a mais distante; em `past`, as anteriores, da mais recente para a mais antiga.
  - `todayInSaoPaulo(now?: Date): string`, via `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`.
  - `AgendaList({ events, today, showOwner })`.
    - Seções "Próximas provas" e "Provas anteriores", cada uma com um `h2`; a de anteriores só aparece quando há alguma.
    - Cada item é um link para `/provas/<id>` com um bloco de data em placar (dia em `font-display` grande e mês abreviado em caixa alta), o nome, a arena, "N inscritos", o `EventStatusBadge` e, para gerente, o dono.
    - Empty state geral: "Nenhuma prova na agenda", com o link "Ir para provas".
  - Página da agenda: o `PageHeader` mantém o título "Minha agenda"; o `OwnerFilter` aparece para gerente.

- [ ] **Step 1: Escrever os testes que falham**

`agenda.test.ts`:
```ts
const ev = (id: string, isoDate: string, status: EventSummary['status'] = 'ABERTA') => ({ id, isoDate, status }) as EventSummary;
const { upcoming, past } = splitAgenda([ev('a', '2026-12-20'), ev('b', '2026-11-16'), ev('c', '2026-10-01'), ev('d', '2026-12-01', 'CANCELADA'), ev('e', '2026-09-01')], '2026-11-16');
expect(upcoming.map((e) => e.id)).toEqual(['b', 'a']);
expect(past.map((e) => e.id)).toEqual(['c', 'e']);
expect(todayInSaoPaulo(new Date('2026-11-17T02:30:00Z'))).toBe('2026-11-16');
```

`e2e/agenda.spec.ts`:
- `agenda do user A mostra a prova dele e não a do B` (com o nome da prova do seed visível em "Próximas provas", já que a data do seed é 05/12/2026).
- `prova cancelada não aparece na agenda`: cria e cancela `COPA AGENDA <projeto>` em `/provas`, depois abre `/agenda` e confere `toHaveCount(0)`.
- `painel do manager filtra atletas e provas pelo mesmo dono`: em `/`, com `Proprietário` = "User B Teste", o `StatTile` "Atletas" mostra `2` e o "Provas" mostra `1` (o seed do B tem 2 atletas e 1 prova, e nenhum teste cria registros para o B). A URL mantém `dono=` depois do reload e os valores continuam os mesmos.

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test && npx playwright test e2e/agenda.spec.ts --project=desktop`
Expected: FAIL

- [ ] **Step 3: Implementar e apagar `AgendaPage.tsx`**

- [ ] **Step 4: Rodar tudo**

Run: `npm run lint && npm test && npm run test:e2e`
Expected: verde

- [ ] **Step 5: Commit** — `feat: agenda em server component e painel com filtro de dono no servidor`

---

### Task 9: Tela de manejo de cadastros (`/cadastros`)

**Files:**
- Create: `src/lib/schemas/shares.ts` (puro) e `shares.test.ts`
- Create: `src/server/services/commands/shares.ts` (sem `server-only`) e `shares.test.ts`
- Create: `src/server/services/records.ts` (`server-only`)
- Create: `src/server/actions/shares.ts` (`'use server'`)
- Create: `app/(app)/cadastros/layout.tsx` (`requireRole(MANAGER_ROLES)`, acima do loading boundary), `page.tsx`, `loading.tsx`
- Create: `src/components/records/RecordsManager.tsx`, `ShareDialog.tsx`, `ReassignDialog.tsx` (client)
- Modify: `src/components/shell/navItems.ts` e `navItems.test.ts` (item "Cadastros")
- Create: `e2e/records.spec.ts`

**Interfaces:**
- Consumes: `runAction`, `useAction`, `Dialog`, `useConfirm` (Task 1); `accessScope`/`eventScope` e as tabelas de vínculo (Task 2); `DomainError`; `EventStatusBadge` (Task 7); `requireRole`.
- Produces:
  - `RecordType = 'athlete' | 'arena'`.
  - `shareSchema = { type: RecordType; ids: string[] (min 1: "Selecione ao menos um cadastro."); userIds: string[] (min 1: "Selecione ao menos um usuário.") }`.
  - `reassignSchema = { ids: string[] (min 1: "Selecione ao menos uma prova."); ownerId: string (min 1: "Selecione o responsável.") }`.
  - Commands:
    - `shareRecords(user, input: { type: RecordType; ids: string[]; userIds: string[] }): Promise<{ added: number }>`
    - `unshareRecords(user, input: same): Promise<{ removed: number }>`
    - `reassignEvents(user, input: { ids: string[]; ownerId: string }): Promise<{ updated: number }>`
    - Regras comuns:
      - Só gerente; qualquer outro papel → `DomainError('Você não tem permissão para esta ação.', { status: 403 })`.
      - Os `ids` precisam existir e estar ativos (provas: não canceladas); senão, `DomainError('Algum cadastro selecionado não existe mais. Recarregue a página.', { status: 404 })`.
      - Os usuários de destino precisam estar ativos e ter papel em `OPERATOR_ROLES`; senão, `DomainError('Usuário inválido.', { field: 'userIds' })` ou `{ field: 'ownerId' }`.
      - `shareRecords` usa `createMany({ skipDuplicates: true })` e não cria vínculo do dono com o próprio cadastro.
  - Leitura:
    - `listManagedRecords(user, { type: 'atletas' | 'arenas' | 'provas'; userId?: string }): Promise<ManagedRecord[]>`, com `ManagedRecord = { id: string; name: string; detail: string; ownerId: string | null; ownerName: string | null; sharedWith: Array<{ id: string; name: string }> }`.
    - `detail`: atleta "Cidade/UF · HC 3,5 / 2,0"; arena "Cidade/UF"; prova "dd/mm/aaaa · Arena · Status".
    - Com `userId`, atletas e arenas usam `accessScope(user, userId)` e provas usam `eventScope(user, userId)`. Provas canceladas ficam fora. `sharedWith` vem vazio em provas.
    - `listShareTargets(user): Promise<Owner[]>`: usuários ativos com papel em `OPERATOR_ROLES`, por nome.
  - Actions (`roles: MANAGER_ROLES`; revalidam `/cadastros`, `/atletas`, `/provas`, `/`, `/agenda`, `/sorteio-avulso`):
    - `shareRecordsAction(input): ActionResult<{ added: number }>`
    - `unshareRecordsAction(input): ActionResult<{ removed: number }>`
    - `reassignEventsAction(input): ActionResult<{ updated: number }>`
  - Item de menu "Cadastros", `href` `/cadastros`, logo depois de "Usuários", só para `MANAGER_ROLES`, com ícone lucide `FolderCog`.
  - Página:
    - `PageHeader` com o título "Manejo de cadastros" e a descrição "Compartilhe atletas e arenas com usuários e defina o responsável de cada prova."
    - Abas em links, com `aria-current="page"`: Atletas, Arenas e Provas (`?tipo=atletas|arenas|provas`, padrão `atletas`), dentro de `nav` com `aria-label="Tipos de cadastro"`.
    - Filtros: `Select` "Usuário" (`?usuario=`, primeira opção "Todos os usuários") e `Input` "Buscar" (filtro no cliente por nome e detalhe).
    - Lista única e responsiva, como a de atletas.
      - Colunas: seleção (checkbox `aria-label="Selecionar <nome>"`; no cabeçalho, `aria-label="Selecionar todos"`, que marca os visíveis), Nome, Detalhes, Proprietário e, em atletas e arenas, "Compartilhado com".
      - "Compartilhado com" mostra chips com o nome e um botão `aria-label="Remover <usuário> de <nome>"`, que chama `unshareRecordsAction` sem confirmação (é reversível), com o sucesso "Compartilhamento removido.".
    - Barra de seleção, visível com 1 ou mais itens:
      - o texto "N selecionado(s)";
      - em atletas e arenas, os botões "Compartilhar com…" e "Remover compartilhamento…";
      - em provas, o botão "Alterar responsável…";
      - o botão "Limpar seleção".
      - Trocar de aba ou de filtro limpa a seleção.
    - `ShareDialog({ open, onClose, mode: 'share' | 'unshare', type, ids, users, onDone })`:
      - título "Compartilhar cadastros" ou "Remover compartilhamento";
      - lista de usuários com checkbox e uma busca "Buscar usuário";
      - botão "Compartilhar" ou "Remover";
      - sucessos "Compartilhado com N usuário(s)." e "Compartilhamento removido.";
      - erro dentro do diálogo.
    - `ReassignDialog({ open, onClose, ids, users, onDone })`:
      - título "Alterar responsável", `Select` "Responsável" e o texto "As provas selecionadas passam a ser deste usuário.";
      - botão "Alterar responsável"; sucesso "Responsável alterado.".
    - Empty state "Nenhum cadastro encontrado".
  - Skeleton: cabeçalho, abas, filtros e 8 linhas.

- [ ] **Step 1: Escrever os testes que falham**

`commands/shares.test.ts`:
- `user não compartilha (403) e nada é gravado`.
- `compartilhar ignora o dono e usa skipDuplicates`: atleta `a1` do dono `u2`, `userIds: ['u2', 'u3']` → `athleteShare.createMany` com `data: [{ athleteId: 'a1', userId: 'u3' }]` e `skipDuplicates: true`.
- `id inexistente → 404 'Algum cadastro selecionado não existe mais. Recarregue a página.'`.
- `usuário de destino inativo → erro no campo userIds`.
- `reassignEvents troca createdById das provas e recusa prova cancelada`.

`schemas/shares.test.ts`: listas vazias geram as mensagens da tabela acima.

`navItems.test.ts`: `navItemsFor('MANAGER')` contém `/cadastros` logo depois de `/usuarios`; `navItemsFor('USER')` não contém `/cadastros`.

`e2e/records.spec.ts` (nomes com o projeto no fim):
```ts
test('manager compartilha um atleta com o user A e depois remove', async ({ page }, testInfo) => {
  const name = `ATLETA COMPARTILHADO ${testInfo.project.name}`;
  await loginAs(page, 'manager');
  await createAthleteViaUi(page, name); // helper local: /atletas → Novo atleta → Salvar
  await page.goto('/cadastros');
  await page.getByRole('checkbox', { name: `Selecionar ${name}` }).check();
  await page.getByRole('button', { name: 'Compartilhar com…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Compartilhar cadastros' });
  await dialog.getByRole('checkbox', { name: 'User A Teste' }).check();
  await dialog.getByRole('button', { name: 'Compartilhar' }).click();
  await expect(page.getByText('Compartilhado com 1 usuário(s).')).toBeVisible();
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await expect(page.getByRole('listitem').filter({ hasText: name })).toContainText('Compartilhado');
  await loginAs(page, 'manager');
  await page.goto('/cadastros');
  await page.getByRole('button', { name: `Remover User A Teste de ${name}` }).click();
  await expect(page.getByText('Compartilhamento removido.')).toBeVisible();
  await loginAs(page, 'userA');
  await page.goto('/atletas');
  await expect(page.getByText(name)).toHaveCount(0);
});
test('manager altera o responsável de uma prova para o user A', async ({ page }, testInfo) => { /* manager cria COPA RESP <projeto> em /provas → /cadastros?tipo=provas → seleciona → Alterar responsável… → User A Teste → login userA → /provas mostra a prova */ });
test('filtro por usuário mostra só o que ele acessa', async ({ page }) => { /* manager → /cadastros?tipo=atletas → Usuário = User B Teste → CABECEIRO B1 e PEZEIRO B1 visíveis, CABECEIRO A1 ausente; a URL tem usuario= */ });
test('user recebe 404 em /cadastros e não vê o item no menu', async ({ page, isMobile }) => { /* response.status() === 404; openNav; link "Cadastros" com count 0 */ });
test('/cadastros sem scroll horizontal e sem erros de console', async ({ page }) => { /* manager; trackConsoleErrors; hasNoHorizontalScroll */ });
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test && npx playwright test e2e/records.spec.ts --project=desktop`
Expected: FAIL

- [ ] **Step 3: Implementar schemas, commands, leitura, actions, página e componentes**

- [ ] **Step 4: Rodar tudo**

Run: `npm run lint && npm test && npm run test:e2e`
Expected: verde

- [ ] **Step 5: Commit** — `feat: manejo de cadastros com compartilhamento em lote e troca de responsável`

---

### Task 10: Documentação, revisão visual e verificação final

**Files:**
- Modify: `docs/project-technical-reference.md`:
  - o bullet desatualizado `app/page.tsx` é a entrada visual (~linha 268) passa a citar `app/(app)/layout.tsx` e as rotas;
  - a seção de componentes troca `EventsPage`/`AthletesPage` por `src/components/{events,arenas,athletes}`;
  - uma subseção nova, "Server Actions", descreve `runAction`, `ActionResult`, `useAction`, os commands e a regra de feedback;
  - as seções de arenas e atletas registram a deduplicação de arena por dono e a validação do dono escolhido por gerente;
  - uma seção nova, "Compartilhamento de cadastros", descreve `AthleteShare`/`ArenaShare`, `accessScope`, quem pode compartilhar, editar e desativar, a tela `/cadastros` e a migration `20261116120000_add_record_shares`; outra seção, "Cadastro do atleta", descreve clube, `document` reservado, notas privadas, aviso de duplicados, as tabelas `BrState`/`Municipality`, o script `scripts/generate-ibge-localities.mjs`, o backfill e o padrão GO/Caiapônia; as tabelas de rotas e de modelos ganham as entradas novas.
- Modify: `app/dev/ui/UiShowcase.tsx` (mostra o `Dialog`)

**Interfaces:**
- Consumes: tudo o que veio antes.
- Produces: documentação atualizada e verificação registrada.

- [ ] **Step 1: Atualizar a documentação e o showcase**

- [ ] **Step 2: Conferir que nada ficou para trás**

Run: `grep -rn "AthletesPage\|AgendaPage\|EventsPage\|NewCompetitorModal\|EventsClient\|AthletesClient" app src e2e docs/project-technical-reference.md`
Expected: nenhum resultado no código; na documentação, só menções históricas explícitas.

Run: `grep -rn "text-white\|#e87900\|#218f83\|#172036" src/components/athletes src/components/events src/components/arenas src/components/filters`
Expected: nenhum resultado.

- [ ] **Step 3: Verificação completa**

Run: `npm run lint && npm test && npm run test:e2e && npm run build`
Expected: tudo verde.

- [ ] **Step 4: Revisão visual**

Tire screenshots de `/`, `/atletas` (com o diálogo aberto e com erro de validação), `/provas` (com o diálogo de nova prova), `/agenda` e `/cadastros` (com seleção e o diálogo de compartilhar), no desktop (1440) e no mobile (375), e confira:
- identidade Arena (areia, tinta couro, terracota, Barlow Condensed nos títulos);
- diálogos inteiros visíveis no mobile;
- sem scroll horizontal;
- foco visível nos botões de ícone.

- [ ] **Step 5: Commit** — `docs: referência técnica com server actions e telas de cadastro`
