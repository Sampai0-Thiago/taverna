-- =====================================================================
-- Ordem do Chaos — esquema inicial
-- TiDB (compatível com MySQL 8). Também roda em MySQL 8.0+.
--
-- Diferenças em relação à versão PostgreSQL original:
--   • UUIDs são gerados pela aplicação (crypto.randomUUID) e guardados em CHAR(36).
--   • updated_at usa ON UPDATE CURRENT_TIMESTAMP (o TiDB não tem triggers).
--   • Datas/horas em DATETIME(3), sempre em UTC (a conexão fixa time_zone = '+00:00').
--   • E-mails são gravados em minúsculas pela aplicação; o índice único é direto na coluna.
--   • CHECKs só são aplicados pelo TiDB com tidb_enable_check_constraint = ON; as mesmas
--     regras já são validadas na API (Zod + regras de domínio).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Usuários / perfis
-- master_token_fp: HMAC-SHA256 (hex) do MASTER_TOKEN usado na ativação; NULL = jogador.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  name             VARCHAR(60)  NOT NULL,
  email            VARCHAR(254) NOT NULL,
  password_hash    VARCHAR(100) NOT NULL,
  bio              VARCHAR(500),
  color            CHAR(7)      NOT NULL DEFAULT '#8B5CF6',
  avatar_file      VARCHAR(255),
  dice_enabled     BOOLEAN      NOT NULL DEFAULT TRUE,
  master_token_fp  CHAR(64),
  master_since     DATETIME(3),
  created_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY users_email_unique (email),
  CONSTRAINT users_color_ck CHECK (color REGEXP '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT users_master_ck CHECK ((master_token_fp IS NULL) = (master_since IS NULL))
);

-- ---------------------------------------------------------------------
-- Agenda: disponibilidade por usuário/dia
-- ---------------------------------------------------------------------
CREATE TABLE availabilities (
  user_id     CHAR(36)    NOT NULL,
  date        DATE        NOT NULL,
  status      VARCHAR(12) NOT NULL,
  note        VARCHAR(140),
  updated_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, date),
  KEY availabilities_date_idx (date),
  CONSTRAINT availabilities_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT availabilities_status_ck CHECK (status IN ('available', 'maybe', 'unavailable'))
);

-- ---------------------------------------------------------------------
-- Sessões de jogo marcadas
-- ---------------------------------------------------------------------
CREATE TABLE game_sessions (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  title           VARCHAR(120) NOT NULL,
  scheduled_date  DATE         NOT NULL,
  start_time      TIME,
  location        VARCHAR(160),
  description     VARCHAR(2000),
  status          VARCHAR(12)  NOT NULL DEFAULT 'planned',
  created_by      CHAR(36),
  created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY game_sessions_date_idx (scheduled_date),
  CONSTRAINT game_sessions_creator_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT game_sessions_status_ck CHECK (status IN ('planned', 'confirmed', 'cancelled'))
);

-- ---------------------------------------------------------------------
-- Personagens (ficha em PDF visível para todos)
-- ---------------------------------------------------------------------
CREATE TABLE characters (
  id                  CHAR(36)     NOT NULL PRIMARY KEY,
  owner_id            CHAR(36)     NOT NULL,
  name                VARCHAR(80)  NOT NULL,
  class_name          VARCHAR(60),
  race                VARCHAR(60),
  level               SMALLINT     NOT NULL DEFAULT 1,
  summary             VARCHAR(2000),
  portrait_file       VARCHAR(255),
  sheet_file          VARCHAR(255),
  sheet_original_name VARCHAR(255),
  created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY characters_owner_idx (owner_id),
  CONSTRAINT characters_owner_fk FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT characters_level_ck CHECK (level BETWEEN 1 AND 30)
);

-- ---------------------------------------------------------------------
-- Mapas e NPCs (imagens) + marcadores (pins) nos mapas
-- ---------------------------------------------------------------------
CREATE TABLE media_assets (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  kind         VARCHAR(8)   NOT NULL,
  title        VARCHAR(120) NOT NULL,
  description  VARCHAR(4000),
  image_file   VARCHAR(255) NOT NULL,
  uploaded_by  CHAR(36),
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY media_assets_kind_idx (kind, created_at),
  CONSTRAINT media_assets_uploader_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT media_assets_kind_ck CHECK (kind IN ('map', 'npc'))
);

CREATE TABLE map_pins (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  asset_id     CHAR(36)     NOT NULL,
  x            DECIMAL(5,2) NOT NULL,  -- % da largura
  y            DECIMAL(5,2) NOT NULL,  -- % da altura
  label        VARCHAR(80)  NOT NULL,
  description  VARCHAR(1000),
  created_by   CHAR(36),
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY map_pins_asset_idx (asset_id),
  CONSTRAINT map_pins_asset_fk FOREIGN KEY (asset_id) REFERENCES media_assets (id) ON DELETE CASCADE,
  CONSTRAINT map_pins_creator_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT map_pins_xy_ck CHECK (x BETWEEN 0 AND 100 AND y BETWEEN 0 AND 100)
);

-- ---------------------------------------------------------------------
-- Taverna: quem leva o quê para o lanche
-- session_id NULL = lista geral.
-- Integridade: item "aberto" não tem responsável; os demais têm (garantido em tavern.rules.js).
-- ---------------------------------------------------------------------
CREATE TABLE tavern_items (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  session_id   CHAR(36),
  name         VARCHAR(100) NOT NULL,
  category     VARCHAR(10)  NOT NULL DEFAULT 'food',
  quantity     VARCHAR(40),
  notes        VARCHAR(300),
  status       VARCHAR(10)  NOT NULL DEFAULT 'open',
  assigned_to  CHAR(36),
  created_by   CHAR(36),
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY tavern_items_session_idx (session_id),
  KEY tavern_items_assigned_idx (assigned_to),
  CONSTRAINT tavern_items_session_fk FOREIGN KEY (session_id) REFERENCES game_sessions (id) ON DELETE CASCADE,
  CONSTRAINT tavern_items_assignee_fk FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT tavern_items_creator_fk FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT tavern_items_category_ck CHECK (category IN ('food', 'drink', 'utensil', 'other')),
  CONSTRAINT tavern_items_status_ck CHECK (status IN ('open', 'claimed', 'bought'))
);

-- ---------------------------------------------------------------------
-- Rolagens de dados (histórico compartilhado do grupo)
-- ---------------------------------------------------------------------
CREATE TABLE dice_rolls (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  user_id     CHAR(36)    NOT NULL,
  expression  VARCHAR(60) NOT NULL,
  mode        VARCHAR(12) NOT NULL DEFAULT 'normal',
  detail      JSON        NOT NULL,   -- resultado de cada grupo de dados
  total       INT         NOT NULL,
  context     VARCHAR(40),            -- aba onde a rolagem foi feita
  created_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY dice_rolls_created_idx (created_at),
  CONSTRAINT dice_rolls_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT dice_rolls_mode_ck CHECK (mode IN ('normal', 'advantage', 'disadvantage'))
);
