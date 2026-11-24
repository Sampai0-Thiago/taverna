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

export const env = Object.freeze({
  nodeEnv,
  isProd,
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: required('DATABASE_URL'),
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
});
