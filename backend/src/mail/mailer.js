import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * Envio de e-mails via SMTP (Gmail, Outlook, Zoho, Brevo, etc. — veja o README).
 * Sem SMTP configurado (só fora de produção), o conteúdo vai para o log em vez de ser enviado.
 */
const transport = env.mail
  ? nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.auth,
    })
  : null;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const mailer = {
  get configured() {
    return transport !== null;
  },

  /** Confere usuário/senha/servidor SMTP na inicialização (não impede a API de subir). */
  async verify() {
    if (!transport) {
      logger.warn('SMTP não configurado: códigos de confirmação serão exibidos apenas no log.');
      return;
    }
    try {
      await transport.verify();
      logger.info(`✉️  SMTP pronto (${env.mail.host}:${env.mail.port})`);
    } catch (error) {
      logger.error({ err: error }, 'SMTP: falha ao autenticar — confira SMTP_HOST/SMTP_USER/SMTP_PASS');
    }
  },

  async sendVerificationCode({ to, name, code, ttlMinutes }) {
    const subject = `${code} é o seu código de confirmação — ${env.appName}`;
    const text = [
      `Olá, ${name}!`,
      '',
      `Seu código de confirmação do ${env.appName} é: ${code}`,
      '',
      `Ele vale por ${ttlMinutes} minutos. Se você não criou uma conta, ignore este e-mail.`,
    ].join('\n');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
        <p>Olá, ${escapeHtml(name)}!</p>
        <p>Seu código de confirmação do <strong>${escapeHtml(env.appName)}</strong> é:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;margin:24px 0">${code}</p>
        <p style="color:#666;font-size:13px">Ele vale por ${ttlMinutes} minutos.
          Se você não criou uma conta, ignore este e-mail.</p>
      </div>`;

    if (!transport) {
      logger.warn({ to, code }, '✉️  [SMTP desligado] código de confirmação');
      return;
    }
    await transport.sendMail({ from: `"${env.appName}" <${env.mail.from}>`, to, subject, text, html });
  },
};
