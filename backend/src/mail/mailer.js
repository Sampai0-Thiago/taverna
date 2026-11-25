import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Envio de e-mails. Provedores (ver env.mail):
 *   - brevo: API HTTP do Brevo (https). Funciona no Render grátis, que bloqueia portas SMTP.
 *   - smtp:  Nodemailer (Gmail com senha de app, Outlook…).
 *   - sem configuração (só fora de produção): o conteúdo vai para o log.
 */
const BREVO_API = 'https://api.brevo.com/v3';

function createBrevoTransport({ apiKey, from }) {
  const call = async (path, init = {}) => {
    const res = await fetch(`${BREVO_API}${path}`, {
      ...init,
      headers: { 'api-key': apiKey, accept: 'application/json', 'content-type': 'application/json', ...init.headers },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw Object.assign(new Error(`Brevo respondeu ${res.status}: ${body.slice(0, 300)}`), { status: res.status });
    }
    return res.status === 204 ? null : res.json().catch(() => null);
  };

  return {
    label: 'Brevo (API)',
    /**
     * Confere a chave consultando /account. 401 = chave inválida (erro).
     * 403 = chave reconhecida, mas sem permissão para ler a conta — comum em chaves com
     * permissões restritas; o envio (/smtp/email) usa outra permissão, então não é falha.
     */
    verify: async () => {
      try {
        await call('/account');
      } catch (error) {
        if (error.status !== 403) throw error;
        logger.warn('Brevo: chave reconhecida, mas sem acesso a /account — o envio será testado no primeiro e-mail.');
      }
    },
    send: ({ to, toName, subject, text, html }) =>
      call('/smtp/email', {
        method: 'POST',
        body: JSON.stringify({
          sender: { name: env.appName, email: from },
          to: [{ email: to, ...(toName ? { name: toName } : {}) }],
          subject,
          textContent: text,
          htmlContent: html,
        }),
      }),
  };
}

function createSmtpTransport({ host, port, secure, auth, from }) {
  const transport = nodemailer.createTransport({ host, port, secure, auth, connectionTimeout: 15_000 });
  return {
    label: `SMTP ${host}:${port}`,
    verify: () => transport.verify(),
    send: ({ to, subject, text, html }) => transport.sendMail({ from: `"${env.appName}" <${from}>`, to, subject, text, html }),
  };
}

const transport = !env.mail ? null : env.mail.provider === 'brevo' ? createBrevoTransport(env.mail) : createSmtpTransport(env.mail);

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** E-mail com um código numérico (confirmação de cadastro, recuperação de senha…). */
async function sendCode({ to, name, code, ttlMinutes, kind, intro, ignore }) {
  const subject = `${code} é o seu código de ${kind} — ${env.appName}`;
  const text = [`Olá, ${name}!`, '', `${intro} ${env.appName}: ${code}`, '', `Ele vale por ${ttlMinutes} minutos. ${ignore}`].join(
    '\n',
  );
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
        <p>Olá, ${escapeHtml(name)}!</p>
        <p>${escapeHtml(intro)} <strong>${escapeHtml(env.appName)}</strong>:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;margin:24px 0">${code}</p>
        <p style="color:#666;font-size:13px">Ele vale por ${ttlMinutes} minutos. ${escapeHtml(ignore)}</p>
      </div>`;

  if (!transport) {
    logger.warn({ to, code, kind }, `✉️  [e-mail desligado] código de ${kind}`);
    return;
  }
  await transport.send({ to, toName: name, subject, text, html });
}

export const mailer = {
  get configured() {
    return transport !== null;
  },

  /** Confere as credenciais na inicialização (não impede a API de subir). */
  async verify() {
    if (!transport) {
      logger.warn('E-mail não configurado: códigos de confirmação serão exibidos apenas no log.');
      return;
    }
    try {
      await transport.verify();
      logger.info(`✉️  E-mail pronto (${transport.label})`);
    } catch (error) {
      logger.error({ err: error }, `E-mail: falha ao validar ${transport.label} — confira as credenciais`);
    }
  },

  sendVerificationCode({ to, name, code, ttlMinutes }) {
    return sendCode({
      to,
      name,
      code,
      ttlMinutes,
      kind: 'confirmação',
      intro: 'Seu código de confirmação do',
      ignore: 'Se você não criou uma conta, ignore este e-mail.',
    });
  },

  sendPasswordResetCode({ to, name, code, ttlMinutes }) {
    return sendCode({
      to,
      name,
      code,
      ttlMinutes,
      kind: 'recuperação de senha',
      intro: 'Use este código para criar uma nova senha no',
      ignore: 'Se você não pediu para trocar a senha, ignore este e-mail — sua senha continua a mesma.',
    });
  },
};
