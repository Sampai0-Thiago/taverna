-- =====================================================================
-- 003 — Recuperação de senha por código enviado ao e-mail
--
-- password_resets: um código pendente por usuário (só o HMAC é guardado),
-- com validade, tentativas erradas e momento do último envio.
--
-- users.password_changed_at: logins (JWT) emitidos antes da última troca de
-- senha deixam de valer — trocar a senha encerra as sessões nos outros aparelhos.
-- =====================================================================

ALTER TABLE users ADD COLUMN password_changed_at DATETIME(3) NULL;

CREATE TABLE password_resets (
  user_id       CHAR(36)    NOT NULL PRIMARY KEY,
  code_hash     CHAR(64)    NOT NULL,
  expires_at    DATETIME(3) NOT NULL,
  attempts      SMALLINT    NOT NULL DEFAULT 0,
  last_sent_at  DATETIME(3) NOT NULL,
  CONSTRAINT password_resets_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
