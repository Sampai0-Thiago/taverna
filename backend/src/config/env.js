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

/** SMTP para envio do código de confirmação. Sem SMTP_HOST, o código só aparece no log (apenas fora de produção). */
function mailConfig() {
  const host = process.env.SMTP_HOST || null;
  if (!host) {
    if (isProd) throw new Error('SMTP_HOST é obrigatório em produção (envio do código de confirmação de e-mail).');
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = required('SMTP_USER');
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    auth: { user, pass: required('SMTP_PASS') },
    from: process.env.MAIL_FROM || user,
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
  appName: process.env.APP_NAME || 'GREMAD',
});
