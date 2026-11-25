import path from 'node:path';
import { tokenFingerprint } from '../utils/masterToken.js';

/**
 * Configuração centralizada e validada na inicialização (fail-fast).
 * Nenhum outro módulo deve ler process.env diretamente.
 */
function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProd = nodeEnv === 'production';
const jwtSecret = required('JWT_SECRET');
const masterToken = required('MASTER_TOKEN');

if (masterToken.length < 8) {
  throw new Error('MASTER_TOKEN deve ter pelo menos 8 caracteres.');
}

if (isProd && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres em produção.');
}

/**
 * DATABASE_URL no formato mysql://usuario:senha@host:porta/banco (TiDB Cloud usa a porta 4000).
 * Caracteres especiais na senha precisam estar codificados (ex.: @ → %40).
 * TLS: ligado por padrão para hosts *.tidbcloud.com; force com DB_SSL=true|false.
 */
function parseDatabaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL inválida. Formato: mysql://usuario:senha@host:4000/banco');
  }
  if (!['mysql:', 'tidb:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL deve começar com mysql:// (TiDB é compatível com MySQL).');
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) throw new Error('DATABASE_URL precisa indicar o nome do banco (ex.: .../ordem_do_chaos).');

  const sslFlag = process.env.DB_SSL;
  const useSsl = sslFlag ? sslFlag === 'true' : url.hostname.endsWith('.tidbcloud.com');
  return {
    host: url.hostname,
    port: Number(url.port || 4000),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    // TiDB Cloud usa certificado de uma CA pública: a cadeia de confiança padrão do Node basta.
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  };
}

/**
 * Envio de e-mail (código de confirmação). Prioridade:
 *   1. Brevo (API HTTP) — BREVO_API_KEY. Funciona no Render grátis, que bloqueia portas SMTP.
 *   2. SMTP — SMTP_HOST/SMTP_USER/SMTP_PASS (Gmail com senha de app, Outlook…).
 *   3. Nenhum — só fora de produção: o código aparece no log da API.
 */
function mailConfig() {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || null;
  if (process.env.BREVO_API_KEY) {
    if (!from) throw new Error('MAIL_FROM é obrigatório com BREVO_API_KEY (remetente verificado no Brevo).');
    return { provider: 'brevo', apiKey: process.env.BREVO_API_KEY, from };
  }
  const host = process.env.SMTP_HOST || null;
  if (!host) {
    if (isProd) throw new Error('Configure BREVO_API_KEY (ou SMTP_HOST) em produção para enviar o código de confirmação.');
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = required('SMTP_USER');
  return {
    provider: 'smtp',
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user, pass: required('SMTP_PASS') },
    from: from ?? user,
  };
}

/**
 * Armazenamento dos uploads. Com R2_BUCKET definido, os arquivos vão para o Cloudflare R2
 * (necessário no Render grátis, cujo disco é apagado a cada reinício). Sem ele, ficam em UPLOAD_DIR.
 */
function storageConfig() {
  if (!process.env.R2_BUCKET) {
    if (isProd) {
      console.warn('[aviso] R2_BUCKET não definido: uploads ficam no disco local e podem ser perdidos em reinícios.');
    }
    return { driver: 'local' };
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
  if (!endpoint) throw new Error('Defina R2_ACCOUNT_ID (ou R2_ENDPOINT) para usar o Cloudflare R2.');
  return {
    driver: 'r2',
    bucket: process.env.R2_BUCKET,
    endpoint,
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
  };
}

export const env = Object.freeze({
  nodeEnv,
  isProd,
  port: Number(process.env.PORT ?? 3333),
  database: Object.freeze(parseDatabaseUrl(required('DATABASE_URL'))),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? 'uploads'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024,
  inviteCode: process.env.INVITE_CODE || null,
  // Só a impressão digital do token fica em memória (ver utils/masterToken.js)
  masterTokenFingerprint: tokenFingerprint(masterToken, jwtSecret),
  // Cookie "Secure" exige HTTPS. Padrão: ligado em produção. Use COOKIE_SECURE=false só em rede local sem HTTPS.
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd,
  logLevel: process.env.LOG_LEVEL ?? 'info',
  mail: mailConfig(),
  storage: Object.freeze(storageConfig()),
  // Quantos proxies confiáveis há na frente da API (Render = 1; Vercel → Render pode exigir 2).
  trustProxy: Number(process.env.TRUST_PROXY ?? 1),
  appName: process.env.APP_NAME || 'GREMAD',
  // Canal do titular de dados (LGPD art. 41 / Res. CD/ANPD 2/2022). Padrão: o remetente dos e-mails.
  privacyContact: process.env.PRIVACY_CONTACT || process.env.MAIL_FROM || process.env.SMTP_USER || null,
});
