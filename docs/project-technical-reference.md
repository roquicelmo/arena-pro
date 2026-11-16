# Sorteios Lagoa — Referência técnica completa

> Documento consolidado da arquitetura, estrutura, banco de dados, APIs,
> autenticação, deploy, configurações, fluxos, skills utilizadas e pendências
> técnicas do projeto.
>
> Este documento não contém senhas, tokens, URLs privadas de banco ou outros
> segredos. Os valores reais devem permanecer nas variáveis de ambiente da
> máquina local e da Vercel.

## 1. Visão geral

O Sorteios Lagoa é uma plataforma SaaS para gestão de provas de laço em dupla.
O sistema cobre o fluxo operacional desde o cadastro até a publicação do
resultado:

- cadastro persistente de atletas;
- cadastro persistente de arenas;
- criação e edição de provas;
- inscrições por prova;
- geração persistente de sorteios;
- operação de pista;
- lançamento de tempos;
- registro de NT, ausência e eliminação;
- tela de locução;
- publicação de resultados;
- relatórios administrativos;
- impressão em formato A4 e salvamento como PDF;
- autenticação com sessão persistente;
- permissões por nível de usuário;
- solicitação pública de acesso;
- habilitação e bloqueio de usuários provisórios;
- isolamento de dados por proprietário;
- histórico persistente em PostgreSQL.

O modo protótipo foi removido do runtime. A aplicação publicada utiliza a API,
o PostgreSQL e o Prisma para os dados operacionais.

## 2. Stack tecnológica

### Aplicação

- Next.js `16.4.6`;
- React `19.2.8`;
- TypeScript `6.0.2`;
- App Router para a aplicação web;
- Pages API do Next para os endpoints HTTP existentes;
- Vercel para deploy.

### Interface

- Tailwind CSS `4.3.3`;
- `@tailwindcss/postcss`;
- PostCSS;
- Lucide React para ícones;
- `clsx`;
- `tailwind-merge`;
- `canvas-confetti`;
- tokens visuais próprios;
- tema claro e minimalista;
- CSS específico para impressão A4.

### Backend

- Prisma `6.19.0`;
- PostgreSQL;
- Auth.js Core `0.41.3`;
- Auth.js Prisma Adapter `2.11.3`;
- `bcryptjs` para comparação de senhas;
- Zod `4.6.7` para validação de payloads;
- funções dinâmicas gerenciadas pelo Next/Vercel.

## 3. Scripts do projeto

Os scripts estão definidos em [`package.json`](../package.json).

```bash
npm run dev
```

Inicia o Next.js em desenvolvimento.

```bash
npm run build
```

Executa `prisma generate` e depois `next build`.

```bash
npm run start
```

Inicia o build de produção com `next start`.

```bash
npm run lint
```

Executa o Oxlint.

```bash
npm run db:generate
```

Gera o Prisma Client.

```bash
npm run db:validate
```

Valida o schema Prisma.

```bash
npm run db:migrate
```

Executa migrations no ambiente de desenvolvimento.

```bash
npm run db:deploy
```

Aplica migrations pendentes no ambiente de deploy.

```bash
npm run db:seed
```

Executa o seed idempotente.

### Ambiente local e testes

```bash
npm run db:local:up       # sobe o Postgres local (Docker, porta 54329)
npm run db:local:migrate  # aplica migrations no banco local de dev
npm run db:local:seed     # seed no banco local de dev
npm run db:test:reset     # recria do zero o banco local de testes + seed de e2e
npm test                  # testes de unidade (Vitest)
npm run test:e2e          # testes ponta a ponta (Playwright, desktop e mobile)
```

Todos os scripts `db:local:*` e `db:test:*` passam por
`scripts/assert-local-db.mjs`, que recusa qualquer banco fora de `localhost`
ou `127.0.0.1`. O reset do banco de testes exige ainda que o nome termine em
`_test`. O Playwright sobe `next dev` na porta 3100 apontando para o banco de
testes e roda `db:test:reset` antes de cada execução.

## 4. Estrutura de diretórios

```text
app/
  layout.tsx                  # HTML global, tema e Toaster
  login/page.tsx              # /login (pública)
  dev/ui/page.tsx             # vitrine dos componentes de UI
  (app)/                      # rotas autenticadas
    layout.tsx                # sessão no servidor + AppShell
    error.tsx
    (painel)/page.tsx         # /
    provas/(lista)/page.tsx   # /provas
    provas/[eventId]/         # layout com abas; page, inscricoes, sorteio,
                              # pista, locucao, resultado
    atletas/                  # /atletas
    agenda/                   # /agenda
    cadastros/                # /cadastros (gerentes): compartilhar e reatribuir
    relatorios/               # /relatorios
    usuarios/                 # /usuarios (papéis de gestão)
    sorteio-avulso/           # /sorteio-avulso (QuickDrawClient)

pages/
  api/
    [...path].ts
    auth/
      [...path].ts
      callback/
        [provider].ts

src/
  index.css

  auth/
    session.ts

  components/
    shell/                    # AppShell, SidebarNav, MobileDrawer, navItems
    ui/                       # primitivos (Button, Badge, Field, Toaster...)
    athletes/                 # AthletesView, AthleteFormDialog, AthleteNotesDialog
    events/                   # EventsView, EventFormDialog, AgendaList
    arenas/                   # ArenasPanel, ArenaFormDialog
    records/                  # RecordsManager, ShareDialog, ReassignDialog
    locations/                # CityPicker (UF + cidade do IBGE)
    filters/                  # OwnerFilter
    AnnouncerPage.tsx
    Dashboard.tsx
    DrawConfiguration.tsx
    EventDetailsPage.tsx
    RegistrationPage.tsx
    ReportsPage.tsx
    ResultsPage.tsx
    RunsTable.tsx
    TransferList.tsx
    UsersPage.tsx
    WizardHeader.tsx

  data/
    referenceAthletes.ts
    referenceEvents.ts

  lib/
    actionResult.ts           # ActionResult e formBannerMessage
    useAction.ts              # hook das Server Actions
    schemas/                  # Zod: cadastros.ts, shares.ts
    agenda.ts
    apiClient.ts              # apiRequest para os bridges client
    drawDefaults.ts
    mappers.ts

  server/
    auth.ts
    next-auth-handler.ts
    next-data-gateway.ts
    permissions.ts
    prisma.ts
    session.ts                # requireUser() e requireActionUser()
    actions/                  # Server Actions (runAction + athletes, arenas, events, shares)
    routes/
    services/                 # leitura de dados para os Server Components
      commands/               # escrita compartilhada por actions e /api
      localities.ts
      records.ts

  types/
    events.ts
    roping.ts

  utils/
    drawAlgorithm.ts

prisma/
  schema.prisma
  seed.ts
  migrations/

e2e/                          # Playwright (desktop e mobile)

docs/
  technical.md
  user-manual.md
  project-technical-reference.md

next.config.ts
next-env.d.ts
postcss.config.mjs
tsconfig.json
tsconfig.next.json
vercel.json
```

## 5. Migração de Vite para Next.js

O projeto originalmente era uma aplicação React/Vite com funções serverless
individuais e rewrites da Vercel. A arquitetura foi migrada para Next.js.

### Removido

- `index.html`;
- `src/main.tsx`;
- `vite.config.ts`;
- `tsconfig.app.json`;
- `tsconfig.node.json`;
- `src/App.css`;
- assets padrão do Vite;
- funções antigas individuais de `api/`;
- gateway antigo `api/index.ts`;
- rewrites antigos da Vercel;
- saída de build antiga `dist/`.

### Atual

- [app/(app)/layout.tsx](../app/(app)/layout.tsx) é o layout autenticado
  (sessão + `AppShell`) e as rotas ficam em `app/(app)/*` (ver 6.1);
  `/login` é a única página pública;
- [app/layout.tsx](../app/layout.tsx) define layout e metadata;
- [pages/api/[...path].ts](../pages/api/[...path].ts) é o gateway de dados;
- [pages/api/auth/[...path].ts](../pages/api/auth/[...path].ts) expõe o Auth.js;
- [pages/api/auth/callback/[provider].ts](../pages/api/auth/callback/[provider].ts)
  mantém o callback explícito de credenciais;
- `.next/` é o diretório de build;
- a Vercel utiliza `framework: nextjs`.

## 6. Arquitetura do Next.js

### 6.1 Rotas

O `src/App.tsx` foi removido: cada seção é uma rota App Router.

| Rota | Conteúdo |
| --- | --- |
| `/login` | Login e solicitação de acesso (pública) |
| `/` | Painel |
| `/provas` | Lista de provas e arenas |
| `/provas/[eventId]` | Detalhes da prova |
| `/provas/[eventId]/inscricoes` | Inscrições |
| `/provas/[eventId]/sorteio` | Configuração e geração do sorteio |
| `/provas/[eventId]/pista` | Pista e lançamento de tempos |
| `/provas/[eventId]/locucao` | Locução |
| `/provas/[eventId]/resultado` | Resultados e publicação |
| `/atletas` | Cadastro de atletas |
| `/agenda` | Minha agenda |
| `/cadastros` | Compartilhar atletas e arenas e trocar o responsável das provas (gerentes) |
| `/relatorios` | Relatórios |
| `/usuarios` | Usuários (perfis de gestão) |
| `/sorteio-avulso` | Sorteio rápido, só em memória |

### 6.2 Layout e sessão

[`app/layout.tsx`](../app/layout.tsx) define `lang="pt-BR"`, importa
`src/index.css` e renderiza o HTML global.

[`app/(app)/layout.tsx`](../app/(app)/layout.tsx) lê a sessão no servidor e
renderiza o `AppShell` (menu lateral no desktop, drawer no mobile). Sem sessão,
(via `requireUser()`) redireciona para `/login`. Como layouts não rodam de novo em navegação client,
cada `page.tsx` também chama `requireUser()`
([`src/server/session.ts`](../src/server/session.ts)).

### 6.3 Dados e mutações

- As páginas são Server Components e leem dados pelos serviços em
  `src/server/services/*` (atletas, arenas, provas, sorteios, usuários),
  que aplicam o escopo por papel e proprietário.
- Os componentes de tela continuam Client Components e recebem os dados por
  props, por meio de "bridges" (`*Client.tsx`) em cada rota.
- Cadastros (atletas, arenas, provas e compartilhamento) mudam por Server
  Actions (6.4). As demais telas ainda chamam `/api/*` com `apiRequest`
  ([`src/lib/apiClient.ts`](../src/lib/apiClient.ts)) e, em seguida,
  `router.refresh()` para recarregar os dados do servidor.
- O sorteio avulso não persiste nada: usa `executeGroupCrossDraw` no cliente.

### 6.4 Server Actions

Arquivos em `src/server/actions/{athletes,arenas,events,shares}.ts`, todos
`'use server'`. Cada action chama `runAction`
([`src/server/actions/runAction.ts`](../src/server/actions/runAction.ts)), que:

1. autentica com `requireActionUser(roles?)`, sem redirecionar;
2. valida a entrada com o schema Zod de `src/lib/schemas/{cadastros,shares}.ts`
   (mensagens em pt-BR, `fieldErrors` por campo);
3. executa o handler, que chama um command de
   `src/server/services/commands/*`;
4. revalida os caminhos (uma falha de revalidação só vai para o log);
5. devolve `ActionResult<T>`
   ([`src/lib/actionResult.ts`](../src/lib/actionResult.ts)):
   `{ ok: true, data } | { ok: false, message, fieldErrors?, code? }`.

Server Actions nunca lançam para o cliente. `DomainError` vira a própria
mensagem (com `field`, vira erro do campo); erro inesperado vira "Não foi
possível concluir a ação" mais `console.error` no servidor; sessão expirada
devolve `code: 'UNAUTHENTICATED'`.

**Commands.** `owner.ts` (`resolveOwnerId`, `resolveCity`, `FORBIDDEN_MESSAGE`),
`athletes.ts`, `arenas.ts`, `events.ts` e `shares.ts` concentram as regras de
escrita. As actions e os handlers `/api` de POST/PATCH/DELETE de atletas,
arenas e provas chamam os mesmos commands, então o comportamento é o mesmo;
o JSON e os status de sucesso da API não mudaram.

**Hook `useAction`** ([`src/lib/useAction.ts`](../src/lib/useAction.ts)):
expõe `pending`, `message`, `fieldErrors`, `execute` e `reset`. Ignora uma
segunda chamada enquanto a primeira está pendente (duplo clique grava uma vez),
trata falha de rede com "Sem conexão com o servidor" e, em
`UNAUTHENTICATED`, mostra o toast e vai para
`/login?next=<página atual>&reason=expired` (`redirectToLogin`).

**Regra de feedback.**

- Ação de formulário: o erro aparece só dentro do formulário (resumo com
  `role="alert"` e erro por campo; `formBannerMessage` omite o resumo quando o
  mesmo texto já está no campo). O diálogo continua aberto com tudo o que foi
  digitado. Sucesso fecha o diálogo e mostra `toast.success`.
- Ação sem formulário (remover, cancelar, desativar): erro em `toast.error`
  (`toastErrors: true`), sucesso em `toast.success`.
- Formulários usam `noValidate`: vale a validação do Zod no servidor.

**`Dialog`** ([`src/components/ui/Dialog.tsx`](../src/components/ui/Dialog.tsx)):
`<dialog>` nativo com `showModal`, foco no primeiro campo, retorno do foco ao
fechar e `busy`, que impede Esc, fundo e "Fechar" durante o salvamento.
Há um exemplo na vitrine `/dev/ui`.

## 7. Arquitetura da API

### 7.1 Gateway de dados

O Next expõe:

```text
pages/api/[...path].ts
```

Esse arquivo delega para:

```text
src/server/next-data-gateway.ts
```

O gateway transforma o caminho público em um handler de domínio.

Exemplo:

```text
/api/athletes
    ↓
route = athletes
    ↓
src/server/routes/athletes/index.ts
```

Outro exemplo:

```text
/api/events/abc123/registrations
    ↓
route = registrations
eventId = abc123
    ↓
src/server/routes/events/[eventId]/registrations/index.ts
```

### 7.2 Handlers de domínio

Os handlers ficam em:

- [src/server/routes/athletes/](../src/server/routes/athletes/);
- [src/server/routes/arenas/](../src/server/routes/arenas/);
- [src/server/routes/events/](../src/server/routes/events/);
- [src/server/routes/users/](../src/server/routes/users/);
- [src/server/routes/reports/](../src/server/routes/reports/);
- [src/server/routes/runs/](../src/server/routes/runs/);
- [src/server/routes/access-requests/](../src/server/routes/access-requests/).

Todos os handlers:

1. recebem método, query, headers e body;
2. verificam autenticação quando necessário;
3. validam permissões;
4. validam payload com Zod quando aplicável;
5. consultam ou alteram o Prisma;
6. retornam JSON e status HTTP explícitos.

### 7.3 Auth.js

Os arquivos de autenticação são:

- [pages/api/auth/[...path].ts](../pages/api/auth/[...path].ts);
- [pages/api/auth/callback/[provider].ts](../pages/api/auth/callback/[provider].ts);
- [src/server/next-auth-handler.ts](../src/server/next-auth-handler.ts);
- [src/server/auth.ts](../src/server/auth.ts);
- [src/auth/session.ts](../src/auth/session.ts).

Não há mais rewrites de API em `vercel.json`.

## 8. Rotas da API

### 8.1 Autenticação

```text
GET  /api/auth/csrf
GET  /api/auth/session
POST /api/auth/callback/credentials
POST /api/auth/signout
```

### 8.2 Solicitações de acesso

```text
POST  /api/access-requests
GET   /api/access-requests
PATCH /api/access-requests
```

### 8.3 Atletas

```text
GET    /api/athletes
POST   /api/athletes
GET    /api/athletes/:id
PATCH  /api/athletes/:id
DELETE /api/athletes/:id
```

### 8.4 Arenas

```text
GET    /api/arenas
POST   /api/arenas
GET    /api/arenas/:id
PATCH  /api/arenas/:id
DELETE /api/arenas/:id
```

Exclusões de arenas são tratadas como desativação lógica quando aplicável.

### 8.5 Provas

```text
GET    /api/events
POST   /api/events
GET    /api/events/:eventId
PATCH  /api/events/:eventId
DELETE /api/events/:eventId
```

### 8.6 Inscrições

```text
GET    /api/events/:eventId/registrations
POST   /api/events/:eventId/registrations
DELETE /api/events/:eventId/registrations/:registrationId
```

### 8.7 Sorteios

```text
GET  /api/events/:eventId/draws
POST /api/events/:eventId/draws
```

### 8.8 Tempos de pista

```text
PATCH /api/runs/:runId/times
```

### 8.9 Resultados

```text
POST /api/events/:eventId/results/publish
```

### 8.10 Usuários

```text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id
```

### 8.11 Relatórios

```text
GET /api/reports/overview
```

## 9. Contratos principais da API

### 9.1 Solicitação pública

`POST /api/access-requests` recebe:

```json
{
  "name": "Nome da pessoa",
  "phone": "(00) 00000-0000",
  "email": "usuario@example.com",
  "recaptchaToken": "token-do-google"
}
```

O servidor valida:

- nome;
- telefone;
- e-mail;
- token reCAPTCHA;
- duplicidade de solicitação pendente.

### 9.2 Criação de atleta

O payload contém dados como:

```json
{
  "name": "Nome do atleta",
  "registrationNo": "123",
  "nickname": "Apelido",
  "phone": "(00) 00000-0000",
  "email": "atleta@example.com",
  "city": "Lagoa da Prata",
  "state": "MG",
  "headHandicap": 3,
  "heelHandicap": 2,
  "ownerId": "id-do-proprietario"
}
```

### 9.3 Criação de arena

```json
{
  "name": "Arena Lagoa",
  "city": "Lagoa da Prata",
  "state": "MG",
  "address": "Endereço opcional",
  "ownerId": "id-do-proprietario"
}
```

### 9.4 Criação de prova

Uma prova referencia uma arena e possui um usuário criador/proprietário.

```json
{
  "name": "Prova de Novembro",
  "eventDate": "2026-11-30T00:00:00.000Z",
  "description": "Descrição opcional",
  "arenaId": "id-da-arena",
  "ownerId": "id-do-proprietario"
}
```

### 9.5 Lançamento de tempos

O endpoint de tempos recebe a corrida e a lista de ocorrências por boi. O
servidor faz upsert, recalcula total/média e atualiza o status da corrida.

## 10. Autenticação e sessão

### 10.1 Configuração

A configuração central está em
[`src/server/auth.ts`](../src/server/auth.ts).

Configuração atual:

- Credentials Provider;
- Prisma Adapter;
- estratégia de sessão JWT;
- `basePath: '/api/auth'`;
- `trustHost: true`;
- página de login lógica;
- callbacks JWT e session;
- validação de usuário ativo;
- validação de expiração;
- inclusão do papel na sessão.

### 10.2 Fluxo de login

1. O frontend chama `/api/auth/csrf`.
2. O Auth.js retorna o token CSRF.
3. O frontend envia e-mail, senha e token.
4. O callback Credentials recebe os dados.
5. O Prisma busca o usuário por e-mail.
6. `bcryptjs` compara a senha com `passwordHash`.
7. Usuários inativos ou expirados são recusados.
8. Auth.js cria o JWT.
9. O cookie seguro é enviado ao navegador.
10. `/api/auth/session` confirma a sessão.

### 10.3 Regras de entrada

O login falha quando:

- o usuário não existe;
- o usuário não possui `passwordHash`;
- o usuário está inativo;
- o acesso expirou;
- a senha está incorreta;
- `AUTH_SECRET` não está disponível no ambiente.

Senhas não são armazenadas em texto puro.

### 10.4 Logout

O frontend:

1. obtém CSRF;
2. chama `/api/auth/signout`;
3. remove a sessão;
4. atualiza o estado para sessão anônima;
5. retorna à tela de login.

## 11. Papéis e permissões

As regras estão em
[`src/server/permissions.ts`](../src/server/permissions.ts).

### 11.1 Admin

Papel:

```text
ADMIN
```

Permissões:

- acesso completo;
- criação de usuários;
- edição de usuários;
- exclusão de usuários;
- habilitação;
- bloqueio;
- aprovação de solicitações;
- acesso a todos os proprietários;
- criação de registros para outros usuários.

### 11.2 Manager

Papel:

```text
MANAGER
```

Permissões:

- operação completa;
- visualização de todos os usuários;
- aprovação e recusa de solicitações;
- habilitação de usuários provisórios;
- bloqueio de usuários provisórios;
- criação de provas, atletas e arenas;
- consulta de todos os proprietários.

Restrições:

- não cria usuários;
- não edita usuários;
- não exclui usuários;
- não altera indevidamente o Admin.

O papel legado `ORGANIZER` é tratado como Manager em algumas verificações.

### 11.3 User

Papel:

```text
USER
```

O User acessa apenas seus próprios:

- atletas;
- arenas;
- provas;
- inscrições;
- sorteios;
- corridas;
- tempos;
- resultados;
- histórico.

### 11.4 Helpers

```ts
isAdmin(role)
isManager(role)
canManageUsers(role)
canEditUsers(role)
canManageData(role)
canAccessOwnerData(role, userId, ownerId)
```

## 12. Ownership e isolamento de dados

O isolamento ocorre no backend, não somente na interface.

### Atletas

```text
Athlete.ownerId
AthleteShare (athleteId, userId)
```

### Arenas

```text
Arena.ownerId
ArenaShare (arenaId, userId)
```

Atletas e arenas podem ser compartilhados (seção 12.1). Ao criar uma arena, o
command reaproveita uma arena ativa do mesmo dono com o mesmo nome (sem
diferenciar maiúsculas) e a mesma cidade, em vez de duplicar. Quando um
gerente informa `ownerId` (API), o servidor valida que é um usuário existente
e ativo; um `ownerId` enviado por User é ignorado.

### Provas

```text
Event.createdById
```

### Regra geral

- Admin vê tudo;
- Manager vê tudo;
- User vê registros próprios e, em atletas e arenas, os compartilhados com ele;
- Admin e Manager podem filtrar por proprietário;
- o proprietário padrão é o usuário autenticado;
- os formulários de cadastro não têm seletor de proprietário: o registro
  nasce do usuário que o criou; trocar o responsável é feito em `/cadastros`;
- rotas filhas também validam o escopo.

As validações se aplicam a:

- inscrições;
- sorteios;
- corridas;
- tempos;
- resultados.

### 12.1 Compartilhamento de cadastros

Atletas e arenas podem ser compartilhados com outros usuários pelas tabelas
`AthleteShare` e `ArenaShare` (chave composta, `onDelete: Cascade`), criadas
pela migration `20261116120000_add_record_shares`.

- **Escopo:** `accessScope(user, ownerId?)` em
  [`src/server/services/scope.ts`](../src/server/services/scope.ts) devolve
  `OR: [dono, compartilhado com o usuário]`. User usa sempre o próprio id;
  gerente sem filtro vê tudo e, com filtro X, vê os de X e os compartilhados
  com X. Provas continuam com `eventScope` (dono único).
- **Quem pode o quê:** quem recebeu o compartilhamento só **vê e usa** o
  cadastro (por exemplo, inscrever o atleta) e escreve as próprias notas
  privadas. **Editar e desativar** exigem ser o dono ou gerente
  (`canAccessOwnerData`); caso contrário, 403 com "Só o proprietário ou um
  gerente pode alterar este cadastro.". Registro inexistente, inativo ou fora
  do escopo responde "não encontrado".
- **Quem compartilha:** só `MANAGER_ROLES` (`shareRecordsAction`,
  `unshareRecordsAction`, em lote) e só eles trocam o responsável de provas
  (`reassignEventsAction`). Provas não são compartilhadas: têm um único dono.
- **Tela `/cadastros`** (item "Cadastros" do menu, só gerentes;
  `src/components/records/*`): abas Atletas, Arenas e Provas, filtro por dono
  (`OwnerFilter`), seleção em lote, `ShareDialog` (compartilhar e remover) e
  `ReassignDialog` (trocar o responsável das provas). Os dados vêm de
  `listManagedRecords` e `listShareTargets`
  ([`src/server/services/records.ts`](../src/server/services/records.ts)).
- **Visibilidade de provas:** `EVENT_VIEW_ROLES` em `permissions.ts` lista os
  papéis que podem ver provas.

### 12.2 Cadastro do atleta

Campos: nome, apelido, clube (`Athlete.club`), telefone, e-mail, cidade/UF,
handicaps e a nota privada. A migration
`20261116130000_add_localities_club_notes` acrescenta `club`, `document`,
`cityCode`, `AthleteNote` e as tabelas de localidades.

- **`document`** é reservado: a coluna existe, sem campo na tela e sem uso
  (não há CPF).
- **Notas privadas:** `AthleteNote` (atleta × usuário). Cada usuário lê e grava
  só a própria nota, em qualquer atleta do seu `accessScope`
  (`saveAthleteNoteAction`).
- **Aviso de duplicados:** ao cadastrar um atleta novo (não ao editar), `checkAthleteDuplicatesAction` procura
  atletas ativos com o mesmo nome (sem acento nem caixa), clube e cidade
  **somente dentro do escopo do usuário**. É só um aviso; o usuário pode
  confirmar e salvar mesmo assim.
- **Localidades:** `BrState` (UF, código IBGE) e `Municipality` (código IBGE,
  nome, UF) são tabelas locais carregadas pela migration. O sistema nunca
  chama a API do IBGE em runtime nem no build; só o script
  [`scripts/generate-ibge-localities.mjs`](../scripts/generate-ibge-localities.mjs)
  a consulta, uma vez, à mão, para gerar os `INSERT` da migration.
  Atleta e arena gravam `cityCode` e também `city`/`state` em texto, copiados
  do município (`resolveCity`).
- **Backfill:** a migration preenche `cityCode` dos registros antigos quando
  `city`/`state` (sem acento nem caixa) apontam para um único município. Os
  demais ficam sem `cityCode` e aparecem como **"Cidade a revisar"** nas
  telas de atletas e arenas, com o campo de cidade vazio para o usuário
  escolher.
- **Padrão:** o formulário começa em UF **GO** e cidade **Caiapônia**
  (`DEFAULT_UF` e `DEFAULT_CITY_NAME` em `localities.ts`; o código do município
  é lido da tabela, nunca fixado), ambos alteráveis no `CityPicker`.

## 13. Solicitação e habilitação de acesso

O formulário público da tela de login recebe:

- nome;
- telefone;
- e-mail;
- token Google reCAPTCHA.

Fluxo:

1. visitante preenche o formulário;
2. frontend renderiza o reCAPTCHA;
3. servidor valida o token com o Google;
4. servidor verifica solicitação pendente duplicada;
5. cria `AccessRequest` com status `PENDING`;
6. Admin ou Manager revisa;
7. aprovação exige senha inicial;
8. usuário é criado como provisório e inativo;
9. Admin ou Manager habilita o acesso;
10. usuário pode fazer login.

Usuários provisórios podem possuir data de expiração.

## 14. Banco de dados

O schema está em [`prisma/schema.prisma`](../prisma/schema.prisma).

Datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL_POOLED")
  directUrl = env("DATABASE_URL")
}
```

### 14.1 Enums

#### `UserRole`

```text
ADMIN
MANAGER
USER
ORGANIZER
TRACK_OPERATOR
ANNOUNCER
JUDGE
ATHLETE
VIEWER
```

#### `EventStatus`

```text
DRAFT
OPEN
DRAWN
IN_PROGRESS
FINISHED
CANCELLED
```

#### `RegistrationStatus`

```text
ACTIVE
CANCELLED
```

#### `DrawStatus`

```text
DRAFT
GENERATED
PUBLISHED
ARCHIVED
```

#### `RunStatus`

```text
PENDING
IN_PROGRESS
COMPLETED
ABSENT
ELIMINATED
```

#### `AccessRequestStatus`

```text
PENDING
APPROVED
REJECTED
```

### 14.2 `User`

Campos:

```text
id
name
email
emailVerified
image
passwordHash
role
active
provisional
accessExpiresAt
managedById
lastLoginAt
createdAt
updatedAt
```

Relacionamentos:

- `createdEvents`;
- `auditLogs`;
- `recordedTimes`;
- `accounts`;
- `sessions`;
- `managedUsers`;
- `managedBy`;
- `ownedAthletes`;
- `ownedArenas`;
- `reviewedAccessRequests`.

Índices:

```text
(role, active)
(managedById)
```

### 14.3 `AccessRequest`

Campos:

```text
id
name
phone
email
status
reviewedById
reviewedAt
createdAt
updatedAt
```

Índices:

```text
(email, status)
(status, createdAt)
```

### 14.4 `Account`

Tabela de compatibilidade com Auth.js:

```text
id
userId
type
provider
providerAccountId
refresh_token
access_token
expires_at
token_type
scope
id_token
session_state
```

### 14.5 `Session`

```text
id
sessionToken
userId
expires
```

### 14.6 `VerificationToken`

```text
identifier
token
expires
```

### 14.7 `Arena`

```text
id
name
city
state
cityCode
address
active
ownerId
createdAt
updatedAt
```

Relacionamentos:

- eventos;
- proprietário;
- município (`cityCode`, opcional);
- compartilhamentos (`ArenaShare`).

Índices:

```text
(city, state)
(ownerId)
(cityCode)
```

### 14.8 `Event`

```text
id
name
eventDate
status
description
arenaId
createdById
publishedAt
createdAt
updatedAt
```

Relacionamentos:

- arena;
- criador;
- inscrições;
- sorteios;
- auditoria.

Índices:

```text
(status, eventDate)
(arenaId)
(createdById)
```

### 14.9 `Athlete`

```text
id
registrationNo
name
nickname
club
document        (reservado, sem uso)
phone
email
city
state
cityCode
headHandicap
heelHandicap
active
ownerId
createdAt
updatedAt
```

Tipos:

```text
headHandicap Decimal(3,1)
heelHandicap Decimal(3,1)
```

Relacionamentos:

- inscrições;
- corridas como cabeceiro;
- corridas como pezeiro;
- proprietário;
- município (`cityCode`, opcional);
- compartilhamentos (`AthleteShare`) e notas privadas (`AthleteNote`).

Índices:

```text
name
(city, state)
active
(ownerId)
```

`registrationNo` é único quando preenchido.

### 14.10 `EventRegistration`

```text
id
eventId
athleteId
category
status
paymentStatus
registeredAt
cancelledAt
```

Restrição:

```text
unique(eventId, athleteId)
```

Índice:

```text
(eventId, status)
```

### 14.11 `Draw`

```text
id
eventId
version
status
configuration
generatedById
generatedAt
publishedAt
createdAt
updatedAt
```

`configuration` é armazenada como JSON.

Restrição:

```text
unique(eventId, version)
```

Índice:

```text
(eventId, status)
```

### 14.12 `Run`

```text
id
drawId
runNumber
phase
round
battery
headAthleteId
heelAthleteId
headGroup
heelGroup
combinedHandicap
numberOfBulls
status
totalTime
averageTime
isNt
createdAt
updatedAt
```

Tipos:

```text
combinedHandicap Decimal(4,1)
totalTime Decimal(8,2)
averageTime Decimal(8,2)
```

Restrição:

```text
unique(drawId, runNumber)
```

Índices:

```text
(drawId, battery, runNumber)
(headAthleteId)
(heelAthleteId)
```

### 14.13 `RunTime`

```text
id
runId
bullNumber
timeSeconds
isNt
recordedById
recordedAt
updatedAt
```

Tipo:

```text
timeSeconds Decimal(8,2)
```

Restrição:

```text
unique(runId, bullNumber)
```

### 14.14 `AthleteShare` e `ArenaShare`

```text
athleteId | arenaId
userId
createdAt
```

Chave primária composta (registro, usuário), índice em `userId` e remoção em
cascata.

### 14.15 `AthleteNote`

```text
athleteId
userId
body
createdAt
updatedAt
```

Chave primária `(athleteId, userId)`: uma nota privada por usuário e atleta.

### 14.16 `BrState` e `Municipality`

```text
BrState:      code (IBGE), uf (único), name
Municipality: code (IBGE), name, uf -> BrState.uf
```

Índice `(uf, name)` em `Municipality`. Carregadas pela migration; ver 12.2.

### 14.17 `AuditLog`

```text
id
userId
eventId
entityType
entityId
action
beforeData
afterData
createdAt
```

Índices:

```text
(entityType, entityId)
(eventId, createdAt)
(userId, createdAt)
```

O modelo está preparado para auditoria detalhada, mas o registro sistemático de
todas as mutações ainda é uma pendência.

## 15. Migrations

Migrations existentes:

```text
prisma/migrations/20261111030000_init/
prisma/migrations/20261113030000_add_access_requests/
prisma/migrations/20261113052510_add_user_roles_and_ownership/
prisma/migrations/20261116120000_add_record_shares/
prisma/migrations/20261116130000_add_localities_club_notes/
```

### Migration inicial

Cria o domínio principal:

- usuários;
- contas;
- sessões;
- arenas;
- atletas;
- provas;
- inscrições;
- sorteios;
- corridas;
- tempos;
- auditoria.

### Migration de solicitações

Cria:

- `AccessRequest`;
- status;
- revisão;
- índices de fila;
- controle de duplicidade pendente.

### Migration de papéis e ownership

Adiciona:

- papéis;
- usuários provisórios;
- data de expiração;
- gestor;
- proprietário de atleta;
- proprietário de arena;
- criador da prova;
- índices de ownership.

### Migration de compartilhamento

`20261116120000_add_record_shares`: cria `AthleteShare` e `ArenaShare`
(aditiva).

### Migration de localidades, clube e notas

`20261116130000_add_localities_club_notes`: cria `BrState`, `Municipality` (com
os dados do IBGE), `AthleteNote`; adiciona `club`, `document` e `cityCode` em
`Athlete` e `cityCode` em `Arena`; faz o backfill do `cityCode`. Aditiva.

## 16. Prisma Client

O cliente está em [`src/server/prisma.ts`](../src/server/prisma.ts).

O código usa uma instância global em ambientes não produtivos para evitar
múltiplas conexões durante hot reload.

Configuração conceitual:

```ts
const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  });
```

Em desenvolvimento, a instância é reutilizada. Em produção, o cliente é
inicializado conforme a execução do ambiente serverless.

## 17. Seed

O seed está em [`prisma/seed.ts`](../prisma/seed.ts).

Arquivos usados:

- [`src/data/referenceAthletes.ts`](../src/data/referenceAthletes.ts);
- [`src/data/referenceEvents.ts`](../src/data/referenceEvents.ts).

O seed é idempotente e cria/atualiza:

- usuário administrador;
- atletas de referência;
- arenas;
- provas de referência.

Variáveis:

```env
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=uma-senha-segura
```

Os valores reais não devem ser incluídos neste documento.

## 18. Variáveis de ambiente

O modelo está em [`.env.example`](../.env.example).

```env
DATABASE_URL=...
DATABASE_URL_POOLED=...
AUTH_SECRET=...
VITE_RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
SEED_ADMIN_EMAIL=...
SEED_ADMIN_PASSWORD=...
```

### `DATABASE_URL`

Conexão direta usada principalmente para migrations.

### `DATABASE_URL_POOLED`

Conexão pooled usada no runtime da aplicação.

### `AUTH_SECRET`

Segredo usado para assinar e validar a sessão JWT do Auth.js.

Deve ser:

- longo;
- aleatório;
- diferente entre ambientes;
- cadastrado na Vercel como variável Production;
- nunca commitado.

### `VITE_RECAPTCHA_SITE_KEY`

Nome histórico mantido para a chave pública do reCAPTCHA utilizada no frontend.
Pode ser renomeado futuramente para:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY
```

### `RECAPTCHA_SECRET_KEY`

Chave privada usada somente no servidor para validação do reCAPTCHA.

### `SEED_ADMIN_EMAIL`

E-mail usado pelo seed para criar o Admin inicial.

### `SEED_ADMIN_PASSWORD`

Senha usada pelo seed para criar o Admin inicial.

### Ambiente local

O modelo está em [`.env.local.example`](../.env.local.example). Copie para
`.env.local` (ignorado pelo git). Ele aponta `DATABASE_URL` e
`DATABASE_URL_POOLED` para o banco `sorteios_lagoa_dev` e `DATABASE_URL_TEST`
para `sorteios_lagoa_test`, ambos no Postgres do `docker-compose.yml`. O
arquivo `.env.production.local` nunca deve ser usado em desenvolvimento ou
testes.

## 19. Configuração da Vercel

Arquivo: [`vercel.json`](../vercel.json).

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### Motivo do `outputDirectory`

Na arquitetura Vite, a saída era:

```text
dist/
```

No Next.js, a saída é:

```text
.next/
```

Quando a Vercel ainda procurava `dist`, o deploy falhava com:

```text
[STATIC_BUILD_NO_OUT_DIR]
No Output Directory named "dist" found
```

### Variáveis da Vercel

Devem ser configuradas nos ambientes necessários:

- Development;
- Preview;
- Production.

As principais são:

- `AUTH_SECRET`;
- `DATABASE_URL`;
- `DATABASE_URL_POOLED`;
- `VITE_RECAPTCHA_SITE_KEY`;
- `RECAPTCHA_SECRET_KEY`.

## 20. Configuração Next.js

Arquivo: [`next.config.ts`](../next.config.ts).

Configuração atual:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

## 21. TypeScript

O TypeScript do Next usa [`tsconfig.next.json`](../tsconfig.next.json).

Características:

- `strict: true`;
- `noEmit: true`;
- `moduleResolution: bundler`;
- `jsx: preserve`;
- `isolatedModules: true`;
- plugin TypeScript do Next;
- aliases `@/*`.

[`tsconfig.json`](../tsconfig.json) referencia a configuração Next.

## 22. Tailwind e CSS

O CSS global está em [`src/index.css`](../src/index.css).

Importação:

```css
@import "tailwindcss";
```

O PostCSS está em [`postcss.config.mjs`](../postcss.config.mjs):

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### Tokens visuais

```css
--surface-page
--surface-raised
--surface-subtle
--line-subtle
--ink-strong
--ink-default
--ink-muted
--brand-amber
--brand-blue
--brand-navy
```

### Direção visual

- tema claro;
- fundo quase branco;
- azul-marinho para textos fortes;
- verde-petróleo para ações estruturais;
- âmbar para ações principais;
- bordas suaves;
- sombras discretas;
- layout operacional;
- responsividade;
- estados vazios e de erro;
- impressão em alto contraste.

Existe uma primitive própria em
[`src/components/ui/Button.tsx`](../src/components/ui/Button.tsx).

O projeto ainda não utiliza formalmente `shadcn/ui` ou Radix; utiliza
componentes próprios com React, Tailwind e Lucide.

## 23. Componentes principais

### Shell e bridges

- [`AppShell`](../src/components/shell/AppShell.tsx): menu lateral, drawer
  mobile e logout; montado em `app/(app)/layout.tsx`.
- `*Client.tsx` em cada rota: ligam os componentes de tela às rotas `/api`
  e chamam `router.refresh()` após cada mutação.
- [`/login`](../app/login/page.tsx): login, visualização da senha, mensagem
  de erro, solicitação de acesso e carregamento explícito do reCAPTCHA.

### `Dashboard`

[`src/components/Dashboard.tsx`](../src/components/Dashboard.tsx)

Exibe:

- atletas;
- participantes;
- corridas;
- provas recentes;
- filtros;
- atalhos.

### Provas e arenas (`src/components/events`, `src/components/arenas`)

- `EventsView` lista as provas; `EventFormDialog` cria e edita (data enviada
  como `AAAA-MM-DD`, gravada ao meio-dia UTC); cancelar usa confirmação;
- `ArenasPanel` e `ArenaFormDialog` listam e cadastram arenas (cidade pelo
  `CityPicker`; "Cidade a revisar" para registros sem `cityCode`);
- `AgendaList` e `src/lib/agenda.ts` montam `/agenda`.

### `EventDetailsPage`

[`src/components/EventDetailsPage.tsx`](../src/components/EventDetailsPage.tsx)

Centraliza acesso a:

- inscrições;
- sorteio;
- pista;
- locução;
- resultado.

### Atletas (`src/components/athletes`)

- `AthletesView`: lista, busca, filtro por dono, criação, edição e
  desativação;
- `AthleteFormDialog`: formulário com `CityPicker`, clube e aviso de
  duplicados;
- `AthleteNotesDialog`: nota privada do usuário;
- registros compartilhados mostram só "usar" e notas para quem não é dono.

### Cadastros (`src/components/records`)

`RecordsManager`, `ShareDialog` e `ReassignDialog` (seção 12.1).

### `RegistrationPage`

[`src/components/RegistrationPage.tsx`](../src/components/RegistrationPage.tsx)

Gerencia:

- escolha de atletas;
- inscrição na prova;
- função de cabeceiro/pezeiro;
- remoção de inscrição;
- contadores.

### Sorteio

Componentes:

- [`DrawConfiguration.tsx`](../src/components/DrawConfiguration.tsx);
- [`TransferList.tsx`](../src/components/TransferList.tsx);
- [`WizardHeader.tsx`](../src/components/WizardHeader.tsx);
- [`RunsTable.tsx`](../src/components/RunsTable.tsx).

### Locução

[`AnnouncerPage.tsx`](../src/components/AnnouncerPage.tsx)

Exibe:

- corrida atual;
- próxima corrida;
- dupla;
- bateria;
- rodada;
- progresso.

### Resultados

[`ResultsPage.tsx`](../src/components/ResultsPage.tsx)

Exibe:

- classificação;
- médias;
- NTs;
- pendências;
- publicação;
- impressão.

### Usuários

[`UsersPage.tsx`](../src/components/UsersPage.tsx)

Gerencia:

- lista de usuários;
- solicitações pendentes;
- aprovação;
- recusa;
- habilitação;
- bloqueio.

### Relatórios

[`ReportsPage.tsx`](../src/components/ReportsPage.tsx)

Exibe:

- totais;
- filtros;
- provas recentes;
- impressão A4.

## 24. Algoritmo de sorteio

O algoritmo está em [`src/utils/drawAlgorithm.ts`](../src/utils/drawAlgorithm.ts).

Fluxo:

1. recebe os competidores;
2. separa cabeceiros e pezeiros;
3. considera handicaps;
4. combina duplas;
5. organiza baterias;
6. define fase e rodada;
7. retorna corridas;
8. o backend grava `Draw` e `Run`.

A geração oficial acontece no servidor, dentro da rota de sorteios.

## 25. Operação de pista

O fluxo de pista:

1. seleciona uma corrida;
2. registra tempo por boi;
3. marca NT quando necessário;
4. recalcula total;
5. recalcula média;
6. atualiza o status;
7. registra o operador responsável;
8. persiste em `RunTime`.

Status possíveis de uma corrida:

```text
PENDING
IN_PROGRESS
COMPLETED
ABSENT
ELIMINATED
```

## 26. Resultados

Resultados:

- ordenam duplas por média final;
- separam NTs;
- exibem pendências;
- impedem publicação prematura;
- marcam o sorteio como publicado;
- marcam a prova como finalizada.

## 27. Impressão e PDF

O sistema não utiliza uma biblioteca adicional de PDF.

Usa:

```ts
window.print()
```

O CSS de impressão:

- utiliza formato A4;
- esconde menu;
- esconde controles;
- adapta cabeçalho;
- mantém tabelas legíveis;
- permite usar “Salvar como PDF” no navegador.

Aplicado em:

- relatórios;
- resultados;
- súmulas.

## 28. Fluxo de dados do frontend

### Inicialização

1. `app/(app)/layout.tsx` lê a sessão no servidor e (via `requireUser()`) redireciona para `/login`
   quando ela não existe;
2. cada `page.tsx` chama `requireUser()` e carrega os dados pelos serviços em
   `src/server/services/*`;
3. os dados chegam aos componentes por props, sem chamadas client de leitura.

### Login

1. em `/login`, o usuário preenche e-mail e senha;
2. `authClient.login()` executa o fluxo Auth.js;
3. após o sucesso, a navegação vai para `/`, já com a sessão no servidor.

### Mutações

1. o bridge da rota chama `/api/*` com `apiRequest`;
2. em caso de erro, exibe um toast;
3. em caso de sucesso, `router.refresh()` recarrega os dados da rota.

### Logout

1. o botão do shell chama `authClient.logout()`;
2. a aplicação retorna a `/login`.

## 29. Status de provas

| Banco | Interface |
| --- | --- |
| `DRAFT` | Aberta |
| `OPEN` | Aberta |
| `DRAWN` | Sorteada |
| `IN_PROGRESS` | Em andamento |
| `FINISHED` | Finalizada |
| `CANCELLED` | Cancelada |

## 30. Testes e validações já realizados

### Build

O build foi validado com:

```text
✓ Compiled successfully
✓ Running TypeScript
✓ Generating static pages
✓ /api/[...path]
✓ /api/auth/[...path]
✓ /api/auth/callback/[provider]
```

### APIs

Foi validado:

- `/api/auth/csrf` respondendo `200`;
- `/api/auth/session` retornando `null` sem sessão;
- `/api/athletes` bloqueando requisição sem autenticação;
- `/api/reports/overview` bloqueando requisição sem autenticação.

### Navegador

Foi validado:

- página pública;
- login do Admin;
- criação de sessão;
- painel;
- navegação;
- sessão após reload;
- logout;
- retorno ao login.

### Testes automatizados

- **Vitest** (`npm test`): trava de banco local, papéis/permissões, helpers de
  sessão (`src/server/session.ts`), leitura de sessão em http e https
  (`src/server/auth.ts`) e primitivas de UI.
- **Playwright** (`npm run test:e2e`), projetos desktop (1440×900) e mobile
  (iPhone 13): login sem erros de console, ausência de scroll horizontal,
  isolamento entre usuários, identidade visual e vitrine de componentes
  (`/dev/ui`, disponível apenas em desenvolvimento).
- Usuários de teste em [`e2e/fixtures/users.ts`](../e2e/fixtures/users.ts),
  criados por [`prisma/seed-e2e.ts`](../prisma/seed-e2e.ts) somente no banco
  local de testes.

## 31. Pendências técnicas

### Alta prioridade

- publicar a correção de carregamento pós-login;
- confirmar `AUTH_SECRET` no ambiente Production;
- confirmar `DATABASE_URL`;
- confirmar `DATABASE_URL_POOLED`;
- configurar `VITE_RECAPTCHA_SITE_KEY`;
- configurar `RECAPTCHA_SECRET_KEY`;
- testar solicitação de acesso em produção;
- criar contas separadas para Manager e User;
- homologar criação, sorteio, tempos e publicação com uma prova de teste.

### Média prioridade

- adicionar rate limiting;
- proteger formulário público contra spam;
- registrar auditoria de todas as mutações;
- adicionar logs de autenticação;
- adicionar observabilidade;
- padronizar tratamento de erros;
- revisar avisos do Oxlint;
- adicionar testes unitários;
- adicionar testes de integração;
- revisar labels internas de status.

### Arquitetura

A divisão do `App.tsx` em rotas App Router (fase 1) está concluída. Próximas
fases: PDF do sorteio avulso e demais ajustes de fluxo.

## 32. Skills utilizadas

### `impeccable`

Skill usada para:

- análise visual;
- tema claro;
- direção minimalista;
- hierarquia visual;
- espaçamento;
- acessibilidade visual;
- estados de erro;
- validação no navegador;
- inspeção da tela de login;
- correção visual após migração;
- validação da cadeia Tailwind/PostCSS.

### Capacidades gerais utilizadas

Também foram utilizadas capacidades gerais de engenharia para:

- exploração do repositório;
- análise de arquitetura;
- migração Vite para Next.js;
- integração Prisma;
- análise de schema;
- integração Auth.js;
- inspeção de APIs;
- validação de cookies;
- validação de build;
- testes manuais no navegador;
- limpeza de arquivos legados;
- atualização das documentações.

Não foram utilizadas nesta etapa:

- `typescript-setup`;
- `typescript-update`;
- `agent-customization`;
- `security-review`.

## 33. Documentação relacionada

- [Documentação técnica](./technical.md);
- [Manual do usuário](./user-manual.md);
- [README do projeto](../README.md);
- [Schema Prisma](../prisma/schema.prisma);
- [Configuração Next](../next.config.ts);
- [Configuração Vercel](../vercel.json).

