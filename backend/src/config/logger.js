import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.logLevel,
  // Rede de segurança: mesmo que algum log inclua estes campos, os valores não são gravados.
  redact: {
    paths: [
      'req.headers', 'req.remoteAddress', 'req.remotePort',
      '*.password', '*.newPassword', '*.currentPassword', '*.passwordHash', '*.password_hash',
      '*.token', '*.code_hash', '*.apiKey', '*.auth',
    ],
    censor: '[removido]',
  },
  ...(env.isProd
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } } }),
});
