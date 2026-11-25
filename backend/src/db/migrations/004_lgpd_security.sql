-- =====================================================================
-- 004 — LGPD e segurança da conta
--
-- privacy_accepted_at / privacy_version: quando e qual versão da Política de
--   Privacidade a pessoa aceitou no cadastro (transparência + responsabilização,
--   art. 6º, VI e X da LGPD).
-- failed_logins / locked_until: bloqueio temporário da conta após muitas senhas
--   erradas — protege contra força bruta mesmo que o atacante troque de IP.
-- =====================================================================

ALTER TABLE users ADD COLUMN privacy_accepted_at DATETIME(3) NULL;
ALTER TABLE users ADD COLUMN privacy_version VARCHAR(20) NULL;
ALTER TABLE users ADD COLUMN failed_logins SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME(3) NULL;
