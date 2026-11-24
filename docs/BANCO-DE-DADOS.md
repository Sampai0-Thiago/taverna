# Banco de dados

PostgreSQL 16 (compatível com 13+). Esquema em [`backend/src/db/migrations/`](../backend/src/db/migrations/): `001_initial_schema.sql` e `002_master_token.sql` (troca a coluna fixa `role` pelo modo mestre via token).

## Modelo entidade-relacionamento

```mermaid
erDiagram
  users ||--o{ availabilities : "marca"
  users ||--o{ game_sessions : "cria"
  users ||--o{ characters : "possui"
  users ||--o{ media_assets : "envia"
  users ||--o{ map_pins : "cria"
  users ||--o{ tavern_items : "leva / cria"
  users ||--o{ dice_rolls : "rola"
  game_sessions ||--o{ tavern_items : "tem"
  media_assets ||--o{ map_pins : "tem"

  users {
    uuid id PK
    varchar name
    varchar email UK "único sem diferenciar maiúsculas"
    text password_hash
    char master_token_fp "HMAC do token de mestre; NULL = jogador"
    timestamptz master_since
    varchar bio
    char color "#RRGGBB"
    text avatar_file
    boolean dice_enabled
  }
  availabilities {
    uuid user_id PK,FK
    date date PK
    varchar status "available | maybe | unavailable"
    varchar note
  }
  game_sessions {
    uuid id PK
    varchar title
    date scheduled_date
    time start_time
    varchar location
    varchar status "planned | confirmed | cancelled"
    uuid created_by FK
  }
  characters {
    uuid id PK
    uuid owner_id FK
    varchar name
    varchar class_name
    varchar race
    smallint level "1–30"
    text portrait_file
    text sheet_file
    varchar sheet_original_name
  }
  media_assets {
    uuid id PK
    varchar kind "map | npc"
    varchar title
    varchar description
    text image_file
    uuid uploaded_by FK
  }
  map_pins {
    uuid id PK
    uuid asset_id FK
    numeric x "0–100 %"
    numeric y "0–100 %"
    varchar label
  }
  tavern_items {
    uuid id PK
    uuid session_id FK "NULL = lista geral"
    varchar name
    varchar category "food | drink | utensil | other"
    varchar quantity
    varchar status "open | claimed | bought"
    uuid assigned_to FK
    uuid created_by FK
  }
  dice_rolls {
    uuid id PK
    uuid user_id FK
    varchar expression
    varchar mode
    jsonb detail
    integer total
    varchar context
  }
```

Todas as tabelas têm `created_at`; as editáveis também têm `updated_at`, mantido por trigger (`set_updated_at`).

## Integridade garantida pelo banco

| Regra | Como |
| ----- | ---- |
| E-mail único sem diferenciar maiúsculas | `UNIQUE INDEX users_email_unique ON users (lower(email))` |
| Uma marcação por pessoa por dia | `PRIMARY KEY (user_id, date)` em `availabilities` |
| Valores de enum válidos | `CHECK (status IN (…))` em todas as colunas de status/tipo |
| Cor válida | `CHECK (color ~ '^#[0-9A-Fa-f]{6}$')` |
| Modo mestre coerente | `CHECK ((master_token_fp IS NULL) = (master_since IS NULL))` |
| Item da Taverna coerente | `CHECK ((status = 'open' AND assigned_to IS NULL) OR (status <> 'open' AND assigned_to IS NOT NULL))` |
| Marcador dentro da imagem | `CHECK (x BETWEEN 0 AND 100)` e idem para `y` |

## Exclusões em cascata

| Ao excluir… | Acontece |
| ----------- | -------- |
| um usuário | apaga disponibilidade, personagens e rolagens; sessões/mídias/itens ficam com autor `NULL` |
| uma sessão | apaga os itens da Taverna dela |
| um mapa | apaga seus marcadores |
| alguém responsável por item | trigger `users_release_tavern_items` devolve o item para `open` |

## Índices

| Índice | Consulta atendida |
| ------ | ----------------- |
| `availabilities_date_idx (date)` | resumo do mês (`WHERE date BETWEEN …`) |
| `game_sessions_date_idx (scheduled_date)` | calendário e próximas sessões |
| `characters_owner_idx (owner_id)` | personagens por jogador |
| `media_assets_kind_idx (kind, created_at DESC)` | galeria por aba |
| `map_pins_asset_idx (asset_id)` | marcadores de um mapa |
| `tavern_items_session_idx (session_id)` | lista da Taverna por sessão |
| `tavern_items_assigned_idx (assigned_to)` | liberar itens ao excluir usuário |
| `dice_rolls_created_idx (created_at DESC)` | histórico recente |

## Migrações

- Arquivos `NNN_descricao.sql` em `backend/src/db/migrations/`, aplicados em ordem alfabética.
- Cada um roda numa transação e é registrado em `schema_migrations` — rodar de novo não faz nada.
- A API aplica migrações pendentes ao iniciar; também é possível rodar `npm run migrate`.
- **Nunca edite uma migração já aplicada**: crie `002_…sql`.

## Backup

```bash
docker compose exec db pg_dump -U chaos ordem_do_chaos > backup.sql
# e copie também o volume "uploads" (imagens e PDFs)
```
