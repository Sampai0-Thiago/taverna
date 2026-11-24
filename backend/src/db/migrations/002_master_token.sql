-- =====================================================================
-- 002 — Mestre por token (substitui o papel fixo "primeiro cadastro = mestre")
--
-- O usuário vira mestre ao informar o MASTER_TOKEN. Guardamos apenas a
-- "impressão digital" (HMAC) do token usado na ativação. Ele é mestre enquanto
-- essa impressão bater com a do token atual: trocar MASTER_TOKEN no servidor
-- revoga automaticamente todos os mestres.
-- =====================================================================

ALTER TABLE users DROP COLUMN role;
ALTER TABLE users ADD COLUMN master_token_fp CHAR(64);       -- HMAC-SHA256 em hex; NULL = jogador
ALTER TABLE users ADD COLUMN master_since    TIMESTAMPTZ;    -- quando ativou o modo mestre

ALTER TABLE users ADD CONSTRAINT users_master_ck
  CHECK ((master_token_fp IS NULL) = (master_since IS NULL));
