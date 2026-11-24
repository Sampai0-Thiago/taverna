# API REST

Base: `/api` · Formato: JSON (uploads em `multipart/form-data`) · Autenticação: cookie `odc_token` (httpOnly), definido no login/cadastro.

Todas as rotas, exceto `/health` e `/auth/*` (menos `/auth/me`), exigem login.
Identificadores são UUID. Datas: `AAAA-MM-DD`. Horários: `HH:MM`.

## Convenções

| Status | Quando |
| ------ | ------ |
| 200 / 201 | Sucesso (201 em criações) |
| 204 | Sucesso sem corpo |
| 400 | Requisição inválida / referência inexistente |
| 401 | Sem login ou sessão expirada |
| 403 | Sem permissão (não é dono nem mestre) |
| 404 | Não encontrado |
| 409 | Conflito (e-mail duplicado, item da Taverna já assumido) |
| 413 / 415 | Arquivo grande demais / tipo não suportado |
| 422 | Falha de validação (`details.fieldErrors`) |
| 429 | Muitas tentativas de login/cadastro |

Erro padrão: `{ "error": { "code": "…", "message": "…", "details": { … } } }`

Objeto **UserRef** (embutido em vários recursos): `{ id, name, color, avatarUrl }`.

---

## Saúde

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| GET | `/health` | `{ status: "ok", time }` — verifica também o banco |

## Autenticação

| Método | Rota | Corpo | Resposta |
| ------ | ---- | ----- | -------- |
| POST | `/auth/register` | `{ name, email, password (≥8), color?, inviteCode? }` | 201 `User` + cookie. Todos começam como `player`. |
| POST | `/auth/login` | `{ email, password }` | 200 `User` + cookie |
| POST | `/auth/logout` | — | 204, apaga o cookie |
| GET | `/auth/me` | — | `User` logado |

`User`: `{ id, name, email, role: "master"|"player", masterSince, bio, color, avatarUrl, diceEnabled, createdAt }` (o `email` só aparece para o próprio usuário). `role` é calculado: `master` enquanto o usuário tiver ativado o modo mestre com o `MASTER_TOKEN` vigente.

## Usuários / perfil

| Método | Rota | Corpo | Observação |
| ------ | ---- | ----- | ---------- |
| GET | `/users` | — | Membros do grupo |
| GET | `/users/:id` | — | |
| PATCH | `/users/me` | `{ name?, bio?, color? }` | |
| PATCH | `/users/me/preferences` | `{ diceEnabled: boolean }` | Switch global de dados |
| PATCH | `/users/me/password` | `{ currentPassword, newPassword }` | 204 |
| PUT | `/users/me/avatar` | multipart `avatar` (imagem) | |
| POST | `/users/me/master` | `{ token }` | Ativa o modo mestre. 403 se o token for inválido. Máx. 10 tentativas / 15 min. |
| DELETE | `/users/me/master` | — | Volta a ser jogador |

## Agenda — disponibilidade

| Método | Rota | Parâmetros / corpo | Resposta |
| ------ | ---- | ------------------ | -------- |
| GET | `/availability?from&to` | intervalo ≤ 400 dias | `[{ userId, date, status, note }]` |
| GET | `/availability/summary?from&to` | | ver abaixo |
| PUT | `/availability/me` | `{ entries: [{ date, status: "available"\|"maybe"\|"unavailable"\|null, note? }] }` | 204. `status: null` remove a marcação. Até 120 datas por chamada, atômico. |

```json
// GET /availability/summary
{
  "memberCount": 4,
  "days": [
    { "date": "2026-12-05", "available": ["uuid…"], "maybe": [], "unavailable": [], "pending": ["uuid…"],
      "allAvailable": false, "score": 2 }
  ],
  "bestDates": [ /* até 5 dias futuros, ordenados: menos "não" → maior score → mais cedo */ ]
}
```

Pontuação: disponível = +2, talvez = +1, sem resposta = 0, indisponível = −3.

## Sessões de jogo

| Método | Rota | Corpo | Observação |
| ------ | ---- | ----- | ---------- |
| GET | `/sessions?from&to` | | Sessões no intervalo |
| GET | `/sessions?upcoming=true&limit=10` | | Próximas (não canceladas) |
| GET | `/sessions/:id` | | |
| POST | `/sessions` | `{ title, scheduledDate, startTime?, location?, description?, status? }` | `status`: `planned` \| `confirmed` \| `cancelled` |
| PATCH | `/sessions/:id` | parcial | Criador ou mestre |
| DELETE | `/sessions/:id` | | Criador ou mestre. Remove os itens da Taverna da sessão. |

## Personagens

| Método | Rota | Corpo (multipart) | Observação |
| ------ | ---- | ----------------- | ---------- |
| GET | `/characters` | | Visível para todos |
| GET | `/characters/:id` | | |
| POST | `/characters` | `name, className?, race?, level?, summary?`, arquivos `portrait` (imagem) e `sheet` (PDF) | |
| PATCH | `/characters/:id` | mesmos campos, todos opcionais | Dono ou mestre. Arquivo novo substitui o antigo. |
| DELETE | `/characters/:id` | | Dono ou mestre. Apaga os arquivos. |

`Character`: `{ id, name, className, race, level, summary, portraitUrl, sheet: { url, fileName } | null, owner: UserRef, createdAt, updatedAt }`

## Mapas e NPCs

| Método | Rota | Corpo | Observação |
| ------ | ---- | ----- | ---------- |
| GET | `/media?kind=map\|npc` | | Todos |
| GET | `/media/:id` | | Todos. Inclui `pins` quando `kind = map` |
| POST | `/media` | multipart: `kind, title, description?`, arquivo `image` | **Somente mestre** |
| PATCH | `/media/:id` | multipart: `title?, description?`, `image?` | **Somente mestre** |
| DELETE | `/media/:id` | | **Somente mestre** |
| POST | `/media/:id/pins` | `{ x: 0–100, y: 0–100, label, description? }` | **Somente mestre**. Só em mapas; coordenadas em % da imagem. |
| DELETE | `/media/:id/pins/:pinId` | | **Somente mestre** |

## Taverna

| Método | Rota | Corpo | Observação |
| ------ | ---- | ----- | ---------- |
| GET | `/tavern/items?sessionId=<uuid>\|general` | | `general` = lista sem sessão |
| POST | `/tavern/items` | `{ sessionId?, name, category?, quantity?, notes?, claim? }` | `claim: true` = "eu levo" já ao criar |
| PATCH | `/tavern/items/:id` | `{ name?, category?, quantity?, notes? }` | Criador ou mestre |
| POST | `/tavern/items/:id/claim` | | `open → claimed`. 409 se alguém já assumiu. |
| POST | `/tavern/items/:id/release` | | `→ open`. Responsável ou mestre. |
| PATCH | `/tavern/items/:id/status` | `{ status: "claimed"\|"bought" }` | Responsável ou mestre |
| DELETE | `/tavern/items/:id` | | Criador ou mestre |

Categorias: `food`, `drink`, `utensil`, `other`.

## Dados

| Método | Rota | Corpo | Observação |
| ------ | ---- | ----- | ---------- |
| GET | `/dice/rolls?limit=30&after=<ISO>` | | Histórico do grupo (mais recentes primeiro), visível para todos os logados. `after` retorna só rolagens posteriores ao instante — usado pelo feed ao vivo. |
| POST | `/dice/rolls` | `{ expression, mode?, context? }` | Rolagem feita no servidor (`crypto.randomInt`) |

Notação: `d20`, `2d6+3`, `1d8+1d6-1`, `d%` (= d100). Limites: 10 termos, 100 dados, 2–1000 faces.
`mode`: `normal` · `advantage` · `disadvantage` (exige um termo `1d20`; rola 2 e mantém o maior/menor).

```json
// 201
{
  "id": "…", "expression": "1d20+5", "mode": "advantage", "total": 22, "modifier": 5,
  "critical": null,
  "groups": [{ "notation": "1d20", "sign": 1, "sides": 20, "rolls": [17], "dropped": [9], "subtotal": 17 }],
  "context": "agenda", "user": { "id": "…", "name": "Lyra", "color": "#22C55E", "avatarUrl": null },
  "createdAt": "2026-11-24T14:50:00.000Z"
}
```

## Arquivos

| Método | Rota | Observação |
| ------ | ---- | ---------- |
| GET | `/files/:nome` | Imagens e PDFs enviados. Exige login. Cache de 7 dias (nomes são UUID imutáveis). |
