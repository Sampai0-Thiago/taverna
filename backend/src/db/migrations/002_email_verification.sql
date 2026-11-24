-- =====================================================================
-- 002 — Confirmação de e-mail por código numérico
--
-- email_verified_at: NULL enquanto o usuário não confirmou o e-mail.
-- email_verifications: um código pendente por usuário. Guardamos só o HMAC do
-- código (nunca o código em si), a validade, as tentativas erradas e quando foi
-- enviado (para limitar reenvios).
-- =====================================================================

ALTER TABLE users ADD COLUMN email_verified_at DATETIME(3) NULL;

CREATE TABLE email_verifications (
  user_id       CHAR(36)    NOT NULL PRIMARY KEY,
  code_hash     CHAR(64)    NOT NULL,
  expires_at    DATETIME(3) NOT NULL,
  attempts      SMALLINT    NOT NULL DEFAULT 0,
  last_sent_at  DATETIME(3) NOT NULL,
  CONSTRAINT email_verifications_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
