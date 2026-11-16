# Refatoração de UX e arquitetura — Sorteios Lagoa

> Data: 2026-11-16 · Status: rascunho para aprovação
> Base de regras de negócio: [project-technical-reference.md](../../project-technical-reference.md)

## 1. Intenção e porquê

O Sorteios Lagoa já está construído (Next.js 16, Prisma, PostgreSQL, Auth.js) e
publicado na Vercel, mas **ainda não está em uso**. Antes de colocá-lo em
operação nas provas, o objetivo é elevar três coisas:

1. **Visual e UX** — eliminar o aspecto genérico/herdado do protótipo escuro e
   dar ao sistema uma identidade própria do mundo do laço.
2. **Qualidade técnica** — sair de um SPA client-side concentrado em
   `src/App.tsx` para rotas App Router com Server Components, mutações seguras e
   componentes de tamanho saudável.
3. **PDF da súmula de sorteio** — documento bonito, legível e confiável,
   apontado pelo usuário como algo "muito importante".

### Quem usa

- **Locutor e auxiliar de pista**, durante a prova.
- **Majoritariamente em computador** → desktop é o alvo principal (tabelas
  densas, leitura rápida, teclado).
- **Responsividade é diferencial** → todas as telas precisam funcionar bem no
  celular, mas não ditam o desenho.

## 2. Objetivos, não-objetivos e anti-objetivos

### Objetivos

- Identidade visual **Arena** aplicada a todo o sistema (seção 5).
- Cada seção atual vira uma **rota App Router** com URL própria (seção 6).
- Leitura de dados em **Server Components**; `'use client'` só onde há
  interação real.
- Mutações via **Server Actions** com Zod + autenticação + permissão +
  ownership, reaproveitando uma camada de serviços de domínio compartilhada.
- **Skeletons** (`loading.tsx`), **empty states**, **error boundaries**
  (`error.tsx`) e **toasts** de feedback em todas as telas.
- Diálogos próprios de confirmação substituindo `window.confirm`.
- **PDF da súmula** gerado no servidor (seção 7).
- **Validação com Playwright** ao fim de cada fase, desktop e mobile, contra
  banco local.
- Corrigir a regra de tempos: **User lança tempos nas próprias provas**
  (decisão do usuário, alinhada à especificação).

### Não-objetivos

- Mudar o algoritmo de sorteio (`src/utils/drawAlgorithm.ts`) — ele é movido/
  reaproveitado, não reescrito.
- Mudanças destrutivas no schema Prisma. Migrations só aditivas, e apenas se
  indispensáveis (avisar antes). As aprovadas até aqui são as do
  compartilhamento de cadastros (seção 6.9) e do cadastro do atleta (seção 6.10).
- Trocar a stack (Auth.js, Prisma, Tailwind permanecem).
- Tema escuro.
- Adotar shadcn/Radix em bloco (componentes próprios continuam; Radix pode ser
  usado pontualmente para diálogo/menu se trouxer acessibilidade grátis — chamada
  do builder).

### Anti-objetivos (seria fracasso mesmo "funcionando")

- Qualquer fase que deixe produção quebrada ou exija "big bang".
- Regressão de regra de negócio: ownership, papéis, status de prova, cálculo de
  média/NT, bloqueio de publicação prematura.
- Visual "template genérico" (cards brancos com sombra azul, gradientes roxos,
  fonte do sistema).
- Rodar testes ou o dev server contra o **banco de produção**.

## 3. Restrições

- Sistema publicado na Vercel; cada fase deve ser **implantável isoladamente**.
- Schema e dados existentes preservados.
- Endpoints `/api/*` continuam funcionando enquanto alguma tela os usar.
  Removidos só quando nenhum consumidor restar (inclusive Auth.js, que fica).
- O único arquivo de ambiente local hoje é `.env.production.local` (aponta para
  produção). **Não deve ser usado** para dev/testes.
- Regras de negócio da referência técnica são a fonte da verdade.
- Textos da interface em pt-BR.

## 4. Abordagens consideradas

### 4.1 Estratégia de refatoração

| Abordagem | Trade-off |
| --- | --- |
| **A · Migração incremental tela por tela** ✅ | Nunca quebra; feedback contínuo. Convivência temporária do antigo com o novo. |
| B · Reescrita completa em branch | Sem convivência, mas semanas sem entregar e erros acumulados no fim. |
| C · Só visual agora | Rápido, mas visual aplicado sobre o `App.tsx` seria refeito depois. |

**Escolhida: A** — pelo usuário, seguindo a recomendação.

### 4.2 Geração do PDF

| Abordagem | Trade-off |
| --- | --- |
| **A · PDF real no servidor com `@react-pdf/renderer`** ✅ | Arquivo idêntico em qualquer navegador, paginação/cabeçalho controlados, compartilhável. Dependência nova e layout separado da tela. |
| B · Página de impressão com CSS (`window.print`) | Zero dependência; varia por navegador, "Página X de Y" falha no Safari. |
| ~~C · Chromium headless na Vercel~~ | Descartada: pesada, cold start lento, limite de tamanho de função. |

**Escolhida: A** — pelo usuário, seguindo a recomendação.

### 4.3 Direção visual

Três direções foram mostradas em mockup (Operacional refinado, Arena,
Minimalista neutro). **Escolhida: B · Arena.**

### 4.4 Layout do PDF

Três layouts foram mostrados (Súmula de pista, Ordem de entrada, Sorteio
compacto). **Escolhido: A · Súmula de pista.**

## 5. Identidade visual "Arena" (decidida)

Referência: mockup `direcao-visual.html`, opção B
(`.superpowers/brainstorm/…/content/`).

- **Tema claro**, fundo areia `#f7f3ec`; superfícies elevadas `#fffdf9`;
  superfície de navegação `#efe7da`; linhas `#e2d6c3` / `#efe7da`.
- **Tinta**: marrom couro `#2a1f16` (forte), `#3a2f25` (padrão), `#8a7a68`
  (suave).
- **Acento de ação**: terracota `#b5471b` (botão principal, NT).
- **Destaque da corrida atual**: `#f3e3cf`.
- **Tipografia**: `Barlow` para texto; `Barlow Condensed` (600/700) para
  títulos em caixa alta, números de corrida, tempos, estatísticas — “placar”.
  Carregadas via `next/font/google`.
- Item ativo da navegação em bloco escuro (`#2a1f16` sobre areia).
- Raios pequenos (4px), sem sombras pesadas, bordas finas.
- Os valores acima são o ponto de partida do mockup; o builder ajusta para
  contraste AA (ex.: `#8a7a68` sobre areia em texto pequeno) mantendo o caráter.
- Tokens definidos como variáveis CSS + `@theme` do Tailwind 4; **remover a
  camada de `!important`** de `src/index.css` à medida que os componentes
  migram (ao final, removida por completo).
- Cores semânticas adicionais (sucesso/tempo lançado, aviso, erro) derivadas
  na mesma família terrosa — chamada do builder.
- Metadata: título “Sorteios Lagoa” (hoje está “Team Roping Pro”).

## 6. Arquitetura alvo

### 6.1 Rotas

Seguindo a proposta da seção 31 da referência técnica:

```text
app/
  layout.tsx                 fontes, tokens, <Toaster/>
  login/page.tsx             login + solicitação de acesso (público)
  (app)/
    layout.tsx               exige sessão; sidebar/drawer; usuário atual
    page.tsx                 painel geral (dashboard)
    provas/page.tsx          provas e arenas
    provas/[eventId]/page.tsx              detalhes da prova
    provas/[eventId]/inscricoes/page.tsx
    provas/[eventId]/sorteio/page.tsx      configuração + geração + revisão
    provas/[eventId]/pista/page.tsx        lançamento de tempos
    provas/[eventId]/locucao/page.tsx
    provas/[eventId]/resultado/page.tsx
    provas/[eventId]/sorteio/sumula.pdf/route.ts   PDF (seção 7)
    sorteio-avulso/page.tsx  sorteio rápido sem prova (seção 6.7)
    sorteio-avulso/sumula.pdf/route.ts      PDF do avulso (POST)
    atletas/page.tsx
    agenda/page.tsx
    usuarios/page.tsx        só Admin/Manager
    cadastros/page.tsx       manejo de cadastros, só Admin/Manager (seção 6.9)
    relatorios/page.tsx
```

- Nomes exatos de segmentos (`/` vs `/painel`) são chamada do builder; URLs em
  pt-BR.
- Cada rota com `loading.tsx` (skeleton fiel ao layout) e `error.tsx`.
- `not-found` para prova inexistente **ou fora do escopo do usuário** (mesmo
  comportamento 404 da API atual, para não vazar existência).

### 6.2 Autenticação nas páginas

- Helper server-only `getCurrentUser()` usando `headers()` do Next e o
  `getAuthenticatedUser` existente em `src/server/auth.ts`.
- `app/(app)/layout.tsx` redireciona para `/login` sem sessão; `/login`
  redireciona para o painel com sessão.
- Checagem de papel por página (ex.: `usuarios` só Admin/Manager) **no
  servidor**, além de esconder o item do menu.
- Opcional: `proxy`/middleware leve para redirecionar cedo — chamada do builder,
  desde que a checagem definitiva continue no servidor.
- O fluxo de login/logout atual (CSRF + callback credentials do Auth.js)
  permanece.

### 6.3 Camada de dados

```text
src/server/
  auth.ts, prisma.ts, permissions.ts   (existentes)
  session.ts            getCurrentUser(), requireUser(), requireRole()
  services/
    athletes.ts  arenas.ts  events.ts  registrations.ts
    draws.ts     runs.ts    results.ts users.ts  access-requests.ts  reports.ts
  actions/              Server Actions ('use server') por domínio
  routes/               handlers /api existentes → passam a chamar services/
```

- **Services** recebem `(user, input)` e concentram consulta Prisma, regra de
  ownership e regra de negócio. São a única fonte dessas regras.
- **Server Components** chamam services diretamente.
- **Server Actions** fazem: `requireUser` → `schema.safeParse` (Zod) → service
  → `revalidatePath`/`refresh` → retorno tipado `{ ok, data } | { ok:false,
  message, fieldErrors }` para o toast/formulário.
- **Handlers `/api`** existentes são reescritos para delegar aos mesmos
  services (elimina duplicação de `toHeaders`/tipos `Vercel*` e checagens de
  papel por string). Removidos quando ficarem sem consumidor.
- Constantes de papel e helpers de `permissions.ts` usados em todo lugar; fim
  dos arrays `['ADMIN','MANAGER','ORGANIZER']` espalhados.
- Mapeamento banco → UI (status de prova, Decimal → number, `Run` persistido →
  modelo de tela) centralizado em um módulo de mapeadores, não dentro de
  componentes.

### 6.4 Correções de regra/robustez incluídas

- **Tempos**: User pode lançar tempos em corridas de provas que criou (hoje
  bloqueado em `routes/runs/[runId]/times.ts`). Admin/Manager seguem em todas.
- **Sorteio**: cálculo da próxima `version` + criação do `Draw`/`Run` dentro de
  `prisma.$transaction` (hoje há corrida entre dois cliques).
- **Lançamento de tempos**: upsert + recálculo de total/média/status em
  transação.
- Publicação de resultados mantém o bloqueio de publicação prematura.
- **Publicação de resultados — ownership**: hoje `results/publish.ts` não
  confere o dono da prova (um User pode publicar prova alheia). Passa a
  aplicar a mesma regra de escopo das demais rotas filhas. *(Achado da
  revisão; correção é chamada minha, por ser regressão de ownership.)*
- **Participantes do sorteio**: as **inscrições ativas da prova são a única
  fonte** (decisão do usuário). O seletor de atletas (`TransferList`) sai da
  tela de sorteio da prova; ela mostra o resumo (quantos cabeceiros/pezeiros
  entram) com link para Inscrições. Para tirar alguém, cancela-se a inscrição.
- **Refazer sorteio** (decisão do usuário):
  - permitido livremente enquanto **nenhum `RunTime`** existir nas corridas da
    versão atual e o resultado não estiver publicado;
  - ao refazer, diálogo de confirmação avisando que súmulas já impressas ficam
    desatualizadas;
  - **bloqueado** (botão desabilitado com explicação + recusa no service)
    depois do primeiro tempo lançado ou da publicação.
- **Prova "local-"**: remover o fallback que cria prova só no estado do
  navegador quando a API falha; erro vira toast. *(Chamada minha.)*
- **Compartilhamento de cadastros**: ver seção 6.9 (mudança do modelo de
  ownership de atletas e arenas).

### 6.5 Componentes

- Quebrar `RunsTable.tsx` (1.200 linhas), `DrawConfiguration.tsx` (1.142) e
  `TransferList.tsx` (434) em componentes menores por responsabilidade
  (filtros, tabela, linha, célula de tempo, resumo, etc.).
- `src/App.tsx` é esvaziado progressivamente e **removido** ao final.
- Primitivas de UI próprias: `Button`, `Input`, `Select`, `Dialog`
  (confirmação), `Toast`, `Badge` de status, `Skeleton`, `EmptyState`,
  `DataTable` simples, `PageHeader`, `StatTile`.
- Estado de URL (filtros, busca, bateria selecionada) em `searchParams` quando
  fizer sentido compartilhar/recarregar.

### 6.6 Tela de pista (prioridade de UX)

Por ser a tela mais usada pelo auxiliar durante a prova:

- Corrida atual destacada; ação "Próxima corrida".
- Lançamento por teclado (Tab/Enter avança para o próximo campo; atalho para
  NT) — detalhamento é chamada do builder.
- Feedback imediato (otimista) com reversão e toast em caso de erro.
- Estatísticas da bateria (concluídas, NT, melhor média) em `StatTile` com
  números condensados.

### 6.7 Locução em tempo quase real

Locutor e auxiliar **trabalham em computadores separados ao mesmo tempo**
(confirmado pelo usuário).

- A tela de locução **se atualiza sozinha** a cada poucos segundos
  (`router.refresh()` periódico ou polling de um endpoint leve; intervalo
  inicial sugerido ~3s, pausando quando a aba está oculta — detalhe do
  builder). SSE/WebSocket ficam fora do escopo.
- A **corrida atual continua calculada**: a primeira corrida da versão vigente
  sem total e sem NT (regra atual de `AnnouncerPage`). Sem campo novo no banco.
- A tela de pista também reflete lançamentos feitos por outro computador ao
  recarregar/refresh — sem exigência de atualização automática lá.

### 6.8 Sorteio avulso (mantido, com novo propósito)

O usuário quer manter um sorteio **sem prova cadastrada**, para atender um
cliente que só quer um sorteio simples: sortear e **enviar o sorteio e as
corridas em PDF**.

- Rota própria `sorteio-avulso`, item próprio no menu ("Sorteio avulso").
- Fluxo em etapas: **participantes → configuração → revisão → baixar PDF**.
  Sem pista, locução ou resultado.
- **Participantes**: escolhidos do cadastro de atletas do usuário (respeitando
  ownership), separados em cabeceiros e pezeiros, com o cadastro rápido de
  atleta já existente. *(Chamada minha: reaproveita handicaps do cadastro.)*
- **Campos de cabeçalho**: título do sorteio (ex.: nome da prova do cliente),
  data e local opcionais, digitados na hora. *(Chamada minha.)*
- **Não persiste** o sorteio no banco. A geração usa o mesmo
  `executeGroupCrossDraw`, executada no servidor (Server Action sem gravação)
  para manter uma única implementação. A revisão fica na tela até o usuário
  sair; refazer gera outro resultado. *(Chamada minha: o pedido é "sortear e
  mandar"; se precisar reabrir depois, vira evolução futura.)*
- **PDF**: mesmo componente da súmula da seção 7, com rótulo "Sorteio" no
  lugar de "Súmula de pista" e sem "versão do sorteio". Gerado por Route
  Handler `POST` autenticado que recebe o cabeçalho e as **corridas já
  sorteadas** (validadas por Zod; IDs de atletas conferidos como pertencentes
  ao escopo do usuário e nomes/handicaps relidos do banco). Não re-sorteia,
  para que o PDF seja exatamente o que foi revisado na tela.

### 6.9 Manejo de cadastros (compartilhamento)

Pedido do usuário durante a fase 2: o seletor de proprietário dentro de cada
modal de cadastro é pouco intuitivo. Em vez dele, Admin e Manager ganham uma
ferramenta para **atribuir cadastros a vários usuários**. Isso **não é
transferência**: o cadastro passa a aparecer para mais de um usuário.

Decisões do usuário (2026-11-16):

- **Tipos compartilháveis:** atletas e arenas. **Provas continuam com um único
  dono** (`createdById`), então o escopo de inscrições, sorteio, pista e
  publicação (fases 3 e 4) não muda.
- **Quem compartilha:** só `MANAGER_ROLES` (Admin, Manager e o legado
  Organizer). User não compartilha.
- **Compartilhar, não copiar:** cada atleta ou arena é **um registro só**,
  ligado a vários usuários. Motivo: no futuro haverá um cadastro unificado do
  atleta, com notas, tempos e provas.
- **O que o usuário compartilhado pode fazer:** **ver e usar** (inscrições,
  sorteio avulso). **Editar e desativar** ficam só com o dono e os gerentes.
  *(Decisão do usuário, revisada em 2026-11-16; substitui "ver, usar e editar".)*
- **Notas privadas:** cada usuário escreve notas e observações próprias sobre um
  atleta que vê (dele ou compartilhado), numa tabela por atleta × usuário,
  visíveis só para quem as escreveu.
- Tempos e resultados já pertencem à prova e não mudam.
- **Modelo de dados:** migration **aditiva** com tabelas de vínculo N:N
  `AthleteShare(athleteId, userId)` e `ArenaShare(arenaId, userId)`, chave
  composta, `onDelete: Cascade` dos dois lados (usuário ou cadastro excluído
  remove o vínculo; o cadastro em si segue a regra atual de dono).
- **Escopo:** para atletas e arenas, o escopo de User passa a ser "dono **ou**
  compartilhado comigo". O filtro de gerente por usuário mostra os cadastros a
  que aquele usuário tem acesso (próprios ou compartilhados).
- **Tela `/cadastros`** ("Manejo de cadastros", só `MANAGER_ROLES`, 404 para
  os demais): abas Atletas, Arenas e Provas; filtro por usuário e busca;
  seleção múltipla com ações em lote "Compartilhar com…" e "Remover
  compartilhamento…"; cada linha mostra o dono e com quem está compartilhado.
  Na aba Provas, que não são compartilháveis, a ação é "Alterar responsável"
  (troca do dono único). *(Chamada minha: sem isso, gerentes perderiam o
  único jeito de criar uma prova para outro usuário ao sair o seletor dos
  modais.)*
- Os modais de cadastro (atleta, arena, prova) **perdem o seletor de
  proprietário**: o cadastro nasce do usuário que o criou.
- Os endpoints `/api` mantêm o campo `ownerId` aceito hoje, por
  compatibilidade, até serem removidos na fase 5.
- **Impacto nas fases seguintes:** a fase 3 deve validar, na inscrição, que o
  atleta está no escopo "dono ou compartilhado" do dono da prova (hoje a rota
  de inscrição aceita qualquer atleta ativo); o sorteio avulso usa o mesmo
  escopo. A fase 4 não muda, porque provas não são compartilhadas.

### 6.10 Cadastro do atleta: clube, localidades oficiais e duplicados

Decisões do usuário (2026-11-16):

- **Sem CPF por enquanto.** "Inicialmente, vamos pedir apenas Cidade, Clube,
  etc." O modelo reserva uma coluna opcional `document`, sem campo na tela.
- **Clube:** campo opcional novo no atleta.
- **Cidade e estado padronizados por fonte oficial:** tabelas locais de UFs e
  municípios com o **código IBGE**, geradas uma vez a partir da API de
  localidades do IBGE (`servicodados.ibge.gov.br/api/v1/localidades`) e
  carregadas por migration. O sistema **nunca chama o IBGE durante o uso**.
  - Atleta e arena guardam o código IBGE do município (`cityCode`). As colunas
    de texto `city`/`state` continuam preenchidas a partir do município, por
    compatibilidade com a API e as telas antigas. *(Chamada minha.)*
  - Na tela: select de UF que começa em **GO** e busca de cidade com
    autocomplete que começa em **Caiapônia**; os dois podem ser alterados. O
    código de Caiapônia vem dos dados baixados, nunca fixado de memória.
  - Registros existentes com cidade em texto livre: a migration tenta casar com
    a tabela (nome normalizado sem acento e sem caixa + UF). Os que não casarem
    ficam sem código e aparecem como "Cidade a revisar" para o dono corrigir.
- **Duplicados:** ao cadastrar, se nome normalizado (sem acento, sem diferença
  de maiúsculas), cidade e clube coincidirem com um atleta existente, o sistema
  avisa "Possível atleta já cadastrado" com as opções **Usar o existente** e
  **Cadastrar mesmo assim**. É só aviso; não bloqueia. A busca considera só o
  que o usuário já vê (os dele e os compartilhados com ele); gerentes procuram
  em todos. Nada de outro usuário vaza para um User.
- Migration **aditiva**: tabelas de UFs, municípios e notas; colunas novas e
  opcionais `club`, `document` e `cityCode` em atleta e `cityCode` em arena.

## 7. PDF da súmula de sorteio (decidido)

Referência: mockup `pdf-sorteio-layout.html`, opção A.

- Gerado por **Route Handler** com `@react-pdf/renderer`, respondendo
  `application/pdf` com `Content-Disposition: attachment;
  filename="sumula-<prova>-v<versão>.pdf"`.
- Mesmas regras de acesso da prova (autenticação + ownership).
- Usa o **sorteio mais recente** da prova (maior `version`). Sem sorteio → a
  ação fica desabilitada na tela; a rota responde 404/422 com mensagem.
- **A4 retrato**, ~28 corridas por página.
- **Cabeçalho em toda página**: rótulo "Súmula de pista", nome da prova, data,
  arena, versão do sorteio, total de corridas, "Página X de Y".
- **Agrupado por bateria**, com faixa de título "Bateria N · Cabeceiros X ×
  Pezeiros Y · Corridas a–b". Quando a bateria mistura mais de um cruzamento
  de grupos (modos `single`/`custom`), a faixa mostra só "Bateria N ·
  Corridas a–b" e os grupos aparecem por linha (ex.: "A×B"). Se uma bateria
  quebrar de página, o título se repete ("continuação"). *(Chamada minha.)*
- **Colunas**: Nº · Cabeceiro (nome + handicap) · Pezeiro (nome + handicap) ·
  SHC · T1 · T2 · T3 · Total (+ coluna de grupos quando houver mistura).
- O componente de PDF é compartilhado com o sorteio avulso (seção 6.8).
- Caixas de tempo **em branco**; bois que não fazem parte da corrida
  (`numberOfBulls` < 3) aparecem **riscados/hachurados**.
- **Rodapé**: "Sorteios Lagoa · gerado em dd/mm/aaaa hh:mm" e linha
  "Assinatura do juiz".
- Estilo: identidade Arena adaptada para impressão — Barlow / Barlow Condensed
  embutidas, números condensados, títulos em caixa alta, **somente preto e
  cinzas**, zebra muito clara, legível em impressora P&B.
- Botão "Baixar súmula (PDF)" na tela de sorteio (e atalho nos detalhes da
  prova).
- O `window.print` atual da tela de sorteio é substituído por este fluxo.
  Relatórios e resultados continuam com impressão CSS nesta refatoração
  (reestilizados na identidade Arena).

## 8. Validação e testes

- **Banco local**: Postgres em container Docker (`docker compose`), arquivo
  `.env.local`/`.env.development.local` apontando para ele, migrations +
  seed. `AUTH_SECRET` local gerado. Credenciais de teste no seed/`.env.example`,
  nunca em chat. `.env.production.local` nunca usado.
- **Playwright** (`@playwright/test`) com projetos desktop (1440×900) e mobile
  (ex.: iPhone 13). Ao final de cada fase:
  - fluxos críticos da fase passam;
  - sem erros no console;
  - screenshots desktop/mobile revisados;
  - sem scroll horizontal no mobile.
- **Fluxos críticos** (acumulativos): login/logout; criar arena e prova; criar
  atleta; inscrever cabeceiros e pezeiros; gerar sorteio; baixar PDF (status
  200, `application/pdf`, número de páginas > 0); lançar tempos incluindo NT;
  locução atualizando sozinha após lançamento em outra aba; refazer sorteio
  bloqueado após tempo lançado; sorteio avulso até o PDF; publicar resultado;
  isolamento — User não vê nem publica dados de outro User.
- **Testes unitários** (Vitest — chamada do builder) para services críticos:
  cálculo de tempos/média/status, permissões/ownership, versão do sorteio.
- `npm run build` e `npm run lint` verdes ao fim de cada fase.
- `.superpowers/` adicionado ao `.gitignore`.

## 9. Fases

Cada fase termina implantável e validada (seção 8).

0. **Fundação** — Docker Postgres + seed + `.env` local; Playwright e Vitest;
   tokens Arena, fontes via `next/font`, primitivas de UI; `session.ts` e
   esqueleto de `services/`; metadata; `.gitignore`.
1. **Shell e rotas** — `/login` e `(app)/layout` com sidebar/drawer na nova
   identidade e proteção no servidor; cada seção ganha sua rota, inicialmente
   podendo reutilizar o componente antigo; `App.tsx` deixa de ser a entrada.
2. **Cadastros** — atletas, arenas, provas, agenda: Server Components +
   Server Actions + services; skeletons, empty states, diálogos, toasts;
   **manejo de cadastros** com compartilhamento de atletas e arenas (seção 6.9,
   migration aditiva); clube, notas privadas, localidades IBGE e aviso de
   duplicados no cadastro do atleta (seção 6.10).
3. **Inscrições e sorteio** — inscrições; configuração/geração/revisão do
   sorteio da prova a partir das inscrições (quebra de
   `DrawConfiguration`/`TransferList`); transação de versão; regra de refazer;
   **PDF da súmula**; **sorteio avulso** com PDF.
4. **Pista, locução e resultado** — quebra de `RunsTable`; lançamento por
   teclado; regra de tempos para User; transação de tempos; locução com
   atualização automática; publicação (com correção de ownership); impressão
   de resultado.
5. **Usuários, relatórios e limpeza** — usuários/solicitações; relatórios;
   remoção de `App.tsx`, componentes antigos, camada `!important` e endpoints
   `/api` sem consumidores; atualização da referência técnica.

Endurecimento fora deste escopo (pendências já listadas na referência técnica,
para uma etapa posterior): rate limiting, auditoria sistemática em `AuditLog`,
observabilidade, revalidação de papel/bloqueio em sessões JWT já emitidas.

## 10. Deixado para o builder

- Nomes exatos de arquivos, componentes e segmentos de rota.
- Ajuste fino de cores para contraste AA e cores semânticas.
- Uso pontual de Radix para Dialog/Menu, ou implementação própria acessível.
- Biblioteca de toast (própria ou leve, ex. `sonner`).
- Vitest vs. outro runner de unidade.
- Detalhes dos atalhos de teclado da pista.
- Ordem interna das tarefas dentro de cada fase.
