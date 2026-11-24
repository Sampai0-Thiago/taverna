# 🎲 Ordem do Chaos

Aplicação **web e mobile (responsiva)** para organizar uma mesa de RPG: agenda com comparação de
disponibilidade, Taverna (quem leva o quê para o lanche), fichas de personagem em PDF,
mapas e NPCs com marcadores e um **rolador de dados global** que pode ser ligado ou desligado em qualquer aba.

| Camada    | Tecnologia                                                              |
| --------- | ----------------------------------------------------------------------- |
| Frontend  | React 19 + Vite, React Router, TanStack Query, react-pdf, lucide-react  |
| Backend   | Node.js 22 + Express 5, Zod, JWT em cookie httpOnly, Multer, Pino       |
| Banco     | TiDB Cloud — compatível com MySQL (SQL puro via mysql2, migrações versionadas) |
| E-mail    | Nodemailer (SMTP) — código de confirmação no cadastro                   |
| Infra     | Docker Compose (api + nginx servindo o front; banco no TiDB Cloud)      |

Todo o código usa **ES Modules** (`"type": "module"`) e frontend/backend ficam em pastas separadas.

---

## Funcionalidades (requisitos → implementação)

| # | Requisito | Onde está |
|---|-----------|-----------|
| 1 | Cadastro de usuários e perfil | `/cadastro`, `/confirmar-email`, `/entrar`, `/perfil` — o cadastro envia um **código de 6 dígitos por e-mail**; o app só libera as abas depois da confirmação (15 min de validade, 5 tentativas, reenvio a cada 60 s). nome, bio, cor na agenda, avatar, troca de senha. Todos entram como jogador; o **modo mestre** é ativado no Perfil com o **token de mestre** (`MASTER_TOKEN`) e desativado quando outra pessoa for mestrar. Código de convite opcional (`INVITE_CODE`). |
| 2 | Agendar e comparar datas (disponível/indisponível) | `/agenda` — modo **Minha agenda** (pincel: Disponível / Talvez / Indisponível; tocar de novo desmarca) e modo **Comparar grupo** (pontos coloridos por jogador, dia verde = todos podem, borda vermelha = alguém não pode). Painel do dia, **Melhores datas** ranqueadas e criação de **sessões**. |
| 3 | Upload de imagens em Mapas e NPCs | `/mapas` — abas Mapas/NPCs, upload com pré-visualização. Mapas têm **marcadores clicáveis** (posição em %). **Todos visualizam; só quem está com o modo mestre ativo envia, edita, exclui e marca.** |
| 4 | Upload de PDF da ficha, visível para todos | `/personagens` — retrato + ficha em PDF; qualquer membro visualiza (pdf.js, funciona no celular), abre em nova aba ou baixa. Só dono/mestre edita. |
| 5 | Aba Taverna | `/taverna` — itens por sessão (ou lista geral), categorias, "**Eu levo**", marcar como comprado, desistir, barra de progresso. Concorrência tratada: dois jogadores não assumem o mesmo item. |
| 6 | Switch de dados em qualquer aba | Switch **Dados** no topo (e em Perfil). Ligado → botão flutuante abre o rolador em qualquer tela. Rolagens feitas **no servidor** (sem trapaça), com vantagem/desvantagem e críticos. **Todos os usuários logados veem os resultados ao vivo** (aviso na tela em qualquer aba, mesmo com o switch desligado) e no histórico compartilhado. |

---

## Como rodar

### Opção A — Docker (tudo de uma vez)

```bash
cp .env.example .env            # defina DATABASE_URL (TiDB), SMTP_*, JWT_SECRET e MASTER_TOKEN
docker compose up --build
```

Acesse **http://localhost:8080**. Para virar mestre: Perfil → Modo mestre → informe o `MASTER_TOKEN`.

### Opção B — Desenvolvimento local

Pré-requisitos: **Node 22.9+** e um cluster **TiDB Cloud** (o plano Starter/Serverless gratuito basta).
Também funciona com MySQL 8 local (`DATABASE_URL=mysql://...:3306/...` e `DB_SSL=false`).

```bash
# 1) Banco: no TiDB Cloud, abra o cluster → Connect → copie host, usuário e senha
#    e monte a DATABASE_URL (veja backend/.env.example). O banco é criado sozinho.

# 2) API
cd backend
cp .env.example .env            # ajuste DATABASE_URL, JWT_SECRET, MASTER_TOKEN e SMTP_*
npm install
npm run migrate                 # cria o banco e as tabelas (a API também faz isso ao subir)
npm run seed                    # (opcional) dados de exemplo — login: mestre@ordem.dev / senha1234
npm run dev                     # http://localhost:3333

# 3) Frontend (outro terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173  (proxy /api → 3333)
```

### Scripts

| Pasta      | Comando           | O que faz                                      |
| ---------- | ----------------- | ---------------------------------------------- |
| `backend`  | `npm run dev`     | API com recarga automática (`node --watch`)    |
| `backend`  | `npm test`        | Testes unitários (`node:test`, sem dependências) |
| `backend`  | `npm run migrate` | Aplica migrações pendentes                     |
| `backend`  | `npm run seed`    | Popula dados de demonstração                   |
| `backend`  | `npm run lint`    | ESLint                                         |
| `frontend` | `npm run dev`     | Vite dev server                                |
| `frontend` | `npm run build`   | Build de produção em `dist/`                   |

---

## Estrutura de pastas

```
ordem-do-chaos/
├── backend/                     API REST (Express 5, ESM)
│   ├── src/
│   │   ├── app.js               montagem do Express (middlewares + rotas)
│   │   ├── server.js            bootstrap: migrações, listen, graceful shutdown
│   │   ├── config/              env validado (fail-fast) e logger
│   │   ├── db/                  pool mysql2 (TiDB), transações, migrador, seed, migrations/*.sql
│   │   ├── middlewares/         auth, validate (Zod), upload (multer + magic bytes), errorHandler
│   │   ├── mail/                envio de e-mail (SMTP) — código de confirmação
│   │   ├── storage/             abstração de arquivos (disco local → trocável por S3)
│   │   ├── utils/               erros de domínio, permissões, validadores, datas
│   │   └── modules/             um diretório por domínio
│   │       ├── auth/            routes · controller · service · schemas · token
│   │       ├── users/           … + repository · mapper
│   │       ├── availability/    … + summary.js (regras puras de comparação)
│   │       ├── sessions/
│   │       ├── characters/
│   │       ├── media/           mapas, NPCs e marcadores
│   │       ├── tavern/          … + rules.js (máquina de estados pura)
│   │       └── dice/            … + engine.js (motor de dados puro)
│   └── tests/                   testes unitários das regras puras
├── frontend/                    SPA React (Vite, ESM)
│   └── src/
│       ├── api/                 cliente HTTP único + endpoints + chaves de cache
│       ├── context/             Auth, Dice (switch global), Toast
│       ├── components/          layout (shell, navegação), ui (primitivos), dice (rolador)
│       ├── features/            agenda · tavern · characters · maps · profile · auth
│       ├── utils/               datas, rótulos em PT-BR
│       └── styles/global.css    tema (tokens CSS) + responsivo
├── docs/                        documentação técnica
└── docker-compose.yml
```

---

## Documentação

- [Arquitetura](docs/ARQUITETURA.md) — camadas, fluxos, segurança, decisões de front e back
- [API REST](docs/API.md) — todos os endpoints, payloads e códigos de erro
- [Banco de dados](docs/BANCO-DE-DADOS.md) — modelo ER, tabelas, restrições e índices
- [Decisões de arquitetura (ADRs)](docs/DECISOES.md) — o porquê de cada escolha
- [Roadmap](docs/ROADMAP.md) — o que vem a seguir

---

## Variáveis de ambiente (backend)

| Variável         | Obrigatória | Padrão                   | Descrição |
| ---------------- | :---------: | ------------------------ | --------- |
| `DATABASE_URL`   | ✅ | —                              | `mysql://usuario:senha@host:4000/banco` (TiDB Cloud) |
| `DB_SSL`         |    | `true` para `*.tidbcloud.com`  | TLS na conexão com o banco |
| `SMTP_HOST`      | ✅ em produção | —              | Servidor SMTP (ex.: `smtp.gmail.com`). Vazio em dev → código aparece no log |
| `SMTP_PORT`      |    | `587`                          | `465` = TLS direto; `587` = STARTTLS |
| `SMTP_USER` / `SMTP_PASS` | ✅ com SMTP | —           | Login SMTP (no Gmail, use uma *senha de app*) |
| `MAIL_FROM`      |    | `SMTP_USER`                    | Remetente exibido |
| `APP_NAME`       |    | `GREMAD`                       | Nome no assunto/corpo do e-mail |
| `JWT_SECRET`     | ✅ | —                              | Segredo do token (≥ 32 caracteres em produção) |
| `MASTER_TOKEN`   | ✅ | —                              | Token que ativa o modo mestre (≥ 8 caracteres). Trocar o valor revoga todos os mestres. |
| `PORT`           |    | `3333`                         | Porta HTTP |
| `JWT_EXPIRES_IN` |    | `7d`                           | Validade da sessão |
| `CORS_ORIGIN`    |    | `http://localhost:5173`        | Origens permitidas (vírgula) |
| `UPLOAD_DIR`     |    | `uploads`                      | Pasta dos arquivos enviados |
| `MAX_UPLOAD_MB`  |    | `15`                           | Tamanho máximo por arquivo |
| `INVITE_CODE`    |    | vazio                          | Se definido, o cadastro exige este código |
| `COOKIE_SECURE`  |    | `true` em produção             | Cookie só via HTTPS |
| `TZ`             |    | do sistema                     | Fuso para "hoje" (ex.: `America/Sao_Paulo`) |
| `LOG_LEVEL`      |    | `info`                         | Nível de log do Pino |
