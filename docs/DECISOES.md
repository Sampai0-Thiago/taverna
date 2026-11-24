# Registro de decisões de arquitetura (ADRs)

Formato curto: contexto → decisão → consequências.

---

## ADR-001 — Monorepo com `frontend/` e `backend/` independentes

**Contexto.** O requisito pede pastas separadas; as duas partes têm ciclos de build diferentes.
**Decisão.** Cada pasta tem seu próprio `package.json` (`"type": "module"`), Dockerfile e scripts. Nada é compartilhado por import entre elas.
**Consequências.** Deploy independente; contrato entre elas é só a API REST documentada em `API.md`.

## ADR-002 — SQL puro (sem ORM) — banco: TiDB Cloud (antes PostgreSQL)

**Contexto.** Domínio pequeno, mas com regras de integridade (unicidade sem caixa, estados da Taverna, upserts).
**Decisão.** Repositórios com SQL parametrizado e migrações `.sql` versionadas. Começou em PostgreSQL + `pg`; migrado para **TiDB Cloud + `mysql2`** (banco gerenciado, plano gratuito). Na migração: UUIDs gerados na aplicação, `ON DUPLICATE KEY UPDATE` no lugar de `ON CONFLICT`, `ON UPDATE CURRENT_TIMESTAMP` no lugar de triggers e sem `RETURNING` (insere e relê pelo id).
**Consequências.** Restrições ficam no banco (CHECK, FK, índices de expressão), sem mágica de ORM; o SQL é revisável. Em troca, escrevemos o mapeamento linha → DTO à mão (arquivos `*.mapper.js` / funções `to*DTO`).

## ADR-003 — Arquitetura em camadas por módulo de domínio

**Decisão.** `routes → controller → service → repository` em cada módulo, mais funções **puras** para as regras centrais (`availability.summary.js`, `tavern.rules.js`, `dice.engine.js`).
**Consequências.** Regras testáveis sem banco (`npm test`), responsabilidades claras, fácil achar código por funcionalidade.

## ADR-004 — JWT em cookie httpOnly (não em localStorage)

**Contexto.** O front precisa exibir imagens e PDFs protegidos; tokens em `localStorage` são legíveis por qualquer XSS.
**Decisão.** JWT assinado em cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção; front e API na mesma origem (proxy).
**Consequências.** `<img src>` e o visualizador de PDF funcionam sem passar token na URL. O usuário é recarregado do banco a cada requisição, então troca de papel/exclusão vale na hora (custo: 1 query leve).

## ADR-005 — Uploads em disco com abstração de storage

**Decisão.** `multer` grava com nome UUID; validação dupla (MIME + magic bytes); banco guarda só o nome; `fileStorage` é a única porta de acesso.
**Consequências.** Simples para começar (um volume Docker). Migrar para S3/R2 = reescrever um módulo. Arquivos órfãos são evitados pelo `errorHandler` e pela remoção pós-commit.

## ADR-006 — Rolagem de dados no servidor com histórico compartilhado

**Contexto.** Em mesa remota, um resultado gerado no navegador não é confiável para os outros jogadores.
**Decisão.** `POST /dice/rolls` rola com `crypto.randomInt` e persiste o resultado; o painel faz *polling* de 4 s enquanto aberto.
**Consequências.** Resultados auditáveis por todos. *Polling* é simples e suficiente para um grupo pequeno; ver Roadmap para WebSocket/SSE.

## ADR-007 — Switch de dados como preferência do usuário

**Decisão.** `users.dice_enabled` guarda o switch; `DiceContext` expõe `enabled/open` para toda a árvore; o botão flutuante e o painel moram no `AppShell`, portanto existem em todas as abas.
**Consequências.** A preferência acompanha o usuário em qualquer dispositivo. O painel é carregado sob demanda (lazy).

## ADR-008 — TanStack Query para estado de servidor

**Decisão.** Todo dado vindo da API passa pelo cache do React Query, com chaves centralizadas (`qk`). Contexts só para sessão, switch de dados e toasts.
**Consequências.** Sem Redux; cache, revalidação, *refetch* ao focar a janela e atualizações otimistas prontos.

## ADR-009 — Controle de concorrência otimista na Taverna

**Decisão.** Transições fazem `UPDATE … WHERE status = <status lido>`; zero linhas afetadas → 409.
**Consequências.** Dois jogadores clicando "Eu levo" ao mesmo tempo: só um vence, o outro recebe aviso e a lista atualiza. Sem locks longos.

## ADR-010 — CSS próprio com tokens (sem framework de UI)

**Contexto.** O visual da referência é muito específico (dourado/roxo, molduras, tipografia medieval).
**Decisão.** Um único `global.css` com variáveis CSS e classes por componente, mobile-first.
**Consequências.** Bundle pequeno e controle total do tema; trocar a paleta = editar `:root`.

## ADR-012 — Mestre por token, não por papel fixo

**Contexto.** O mestre muda conforme o jogo; "primeiro cadastro = mestre" não atende. Mapas e NPCs são conteúdo do mestre.
**Decisão.** `MASTER_TOKEN` (variável de ambiente). Quem o informa no Perfil ativa o modo mestre; pode desativar a qualquer momento. O banco guarda só o HMAC do token usado; o papel é recalculado a cada requisição comparando com o HMAC do token vigente. Escrita em Mapas/NPCs exige `requireRole('master')`.
**Consequências.** Troca de mestre sem intervenção de ninguém; vários mestres simultâneos são possíveis; trocar o token revoga todos de uma vez. Quem conhece o token pode se ativar — compartilhe-o só com quem vai mestrar e troque-o quando necessário.
*Substitui* a regra do primeiro usuário da versão inicial (migração `002`).

## ADR-013 — Resultados de dados visíveis para todos, em qualquer aba

**Decisão.** Componente `RollFeed` global faz *polling* incremental (`?after=`) a cada 4 s e mostra as rolagens dos outros jogadores, independentemente do switch de dados.
**Consequências.** Ninguém perde uma rolagem. Custo: uma requisição leve a cada 4 s por usuário com a aba visível — adequado para um grupo de mesa; WebSocket/SSE fica no Roadmap.

## ADR-011 — Grupo único (por enquanto)

**Contexto.** O pedido descreve uma mesa ("Ordem do Chaos").
**Decisão.** Todos os usuários cadastrados pertencem ao mesmo grupo; `INVITE_CODE` fecha o cadastro.
**Consequências.** Modelo simples. Para várias mesas, adicionar `campaigns` + `campaign_members` e um `campaign_id` nas tabelas de domínio (ver Roadmap).

## ADR-014 — Confirmação de e-mail por código numérico

**Contexto.** Evitar cadastros com e-mail digitado errado ou de terceiros.
**Decisão.** No cadastro a API envia (SMTP/Nodemailer) um código de 6 dígitos. A conta já fica logada, mas só acessa `/auth/me`, `/auth/verify-email`, `/auth/resend-verification` e `/auth/logout` até confirmar. O banco guarda apenas o HMAC-SHA256 do código; validade de 15 min, 5 tentativas por código, reenvio a cada 60 s e rate limit por IP.
**Consequências.** Código é mais fácil no celular do que link (não depende de abrir o e-mail no mesmo aparelho). Em desenvolvimento sem SMTP o código aparece no log da API; em produção `SMTP_HOST` é obrigatório.
