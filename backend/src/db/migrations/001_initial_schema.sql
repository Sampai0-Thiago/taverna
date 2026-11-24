-- =====================================================================
-- Ordem do Chaos — esquema inicial
-- PostgreSQL 13+ (gen_random_uuid() é nativo)
-- =====================================================================

-- Atualiza automaticamente a coluna updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- Usuários / perfis
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(60)  NOT NULL,
  email          VARCHAR(254) NOT NULL,
  password_hash  TEXT         NOT NULL,
  role           VARCHAR(10)  NOT NULL DEFAULT 'player' CHECK (role IN ('master', 'player')),
  bio            VARCHAR(500),
  color          CHAR(7)      NOT NULL DEFAULT '#8B5CF6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  avatar_file    TEXT,
  dice_enabled   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Agenda: disponibilidade por usuário/dia
-- ---------------------------------------------------------------------
CREATE TABLE availabilities (
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  status      VARCHAR(12) NOT NULL CHECK (status IN ('available', 'maybe', 'unavailable')),
  note        VARCHAR(140),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
CREATE INDEX availabilities_date_idx ON availabilities (date);
CREATE TRIGGER availabilities_updated_at BEFORE UPDATE ON availabilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Sessões de jogo marcadas
-- ---------------------------------------------------------------------
CREATE TABLE game_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(120) NOT NULL,
  scheduled_date  DATE         NOT NULL,
  start_time      TIME,
  location        VARCHAR(160),
  description     VARCHAR(2000),
  status          VARCHAR(12)  NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'confirmed', 'cancelled')),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX game_sessions_date_idx ON game_sessions (scheduled_date);
CREATE TRIGGER game_sessions_updated_at BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Personagens (ficha em PDF visível para todos)
-- ---------------------------------------------------------------------
CREATE TABLE characters (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id           UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               VARCHAR(80)  NOT NULL,
  class_name         VARCHAR(60),
  race               VARCHAR(60),
  level              SMALLINT     NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 30),
  summary            VARCHAR(2000),
  portrait_file      TEXT,
  sheet_file         TEXT,
  sheet_original_name VARCHAR(255),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX characters_owner_idx ON characters (owner_id);
CREATE TRIGGER characters_updated_at BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Mapas e NPCs (imagens) + marcadores (pins) nos mapas
-- ---------------------------------------------------------------------
CREATE TABLE media_assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         VARCHAR(8)   NOT NULL CHECK (kind IN ('map', 'npc')),
  title        VARCHAR(120) NOT NULL,
  description  VARCHAR(4000),
  image_file   TEXT         NOT NULL,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX media_assets_kind_idx ON media_assets (kind, created_at DESC);
CREATE TRIGGER media_assets_updated_at BEFORE UPDATE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE map_pins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id     UUID         NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  x            NUMERIC(5,2) NOT NULL CHECK (x BETWEEN 0 AND 100),  -- % da largura
  y            NUMERIC(5,2) NOT NULL CHECK (y BETWEEN 0 AND 100),  -- % da altura
  label        VARCHAR(80)  NOT NULL,
  description  VARCHAR(1000),
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX map_pins_asset_idx ON map_pins (asset_id);

-- ---------------------------------------------------------------------
-- Taverna: quem leva o quê para o lanche
-- ---------------------------------------------------------------------
CREATE TABLE tavern_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID REFERENCES game_sessions(id) ON DELETE CASCADE,  -- NULL = lista geral
  name         VARCHAR(100) NOT NULL,
  category     VARCHAR(10)  NOT NULL DEFAULT 'food'
               CHECK (category IN ('food', 'drink', 'utensil', 'other')),
  quantity     VARCHAR(40),
  notes        VARCHAR(300),
  status       VARCHAR(10)  NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'bought')),
  assigned_to  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Integridade: item "aberto" não tem responsável; os demais têm.
  CONSTRAINT tavern_items_assignment_ck CHECK (
    (status = 'open' AND assigned_to IS NULL) OR (status <> 'open' AND assigned_to IS NOT NULL)
  )
);
CREATE INDEX tavern_items_session_idx ON tavern_items (session_id);
CREATE INDEX tavern_items_assigned_idx ON tavern_items (assigned_to);

-- Se um usuário for excluído, os itens que ele levaria voltam a ficar "abertos"
-- (um simples ON DELETE SET NULL violaria a constraint de atribuição acima).
CREATE OR REPLACE FUNCTION release_tavern_items_of_deleted_user() RETURNS trigger AS $$
BEGIN
  UPDATE tavern_items SET status = 'open', assigned_to = NULL WHERE assigned_to = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER users_release_tavern_items BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION release_tavern_items_of_deleted_user();
CREATE TRIGGER tavern_items_updated_at BEFORE UPDATE ON tavern_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- Rolagens de dados (histórico compartilhado do grupo)
-- ---------------------------------------------------------------------
CREATE TABLE dice_rolls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expression  VARCHAR(60) NOT NULL,
  mode        VARCHAR(12) NOT NULL DEFAULT 'normal'
              CHECK (mode IN ('normal', 'advantage', 'disadvantage')),
  detail      JSONB       NOT NULL,   -- resultado de cada grupo de dados
  total       INTEGER     NOT NULL,
  context     VARCHAR(40),            -- aba onde a rolagem foi feita
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dice_rolls_created_idx ON dice_rolls (created_at DESC);
