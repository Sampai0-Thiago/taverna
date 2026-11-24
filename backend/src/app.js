import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { query } from './db/pool.js';
import { requireAuth } from './middlewares/auth.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { availabilityRoutes } from './modules/availability/availability.routes.js';
import { charactersRoutes } from './modules/characters/characters.routes.js';
import { diceRoutes } from './modules/dice/dice.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';
import { sessionsRoutes } from './modules/sessions/sessions.routes.js';
import { tavernRoutes } from './modules/tavern/tavern.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { fileStorage } from './storage/fileStorage.js';
import { notFound } from './utils/errors.js';

/**
 * Monta a aplicação Express (sem abrir porta) — facilita testes de integração.
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy); // atrás do nginx/Render/Vercel

  // A API só serve JSON e arquivos; CSP fica a cargo do servidor do frontend.
  // (CSP com object-src 'none' impediria o visualizador de PDF do navegador.)
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));

  // ---- Rotas públicas ----
  app.get('/api/health', async (_req, res) => {
    await query('SELECT 1');
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
  app.use('/api/auth', authRoutes);

  // ---- Rotas autenticadas ----
  const api = express.Router();
  api.use(requireAuth);
  api.use('/users', usersRoutes);
  api.use('/availability', availabilityRoutes);
  api.use('/sessions', sessionsRoutes);
  api.use('/characters', charactersRoutes);
  api.use('/media', mediaRoutes);
  api.use('/tavern', tavernRoutes);
  api.use('/dice', diceRoutes);
  // Arquivos enviados (imagens/PDFs): só membros logados acessam (disco local ou Cloudflare R2).
  api.get('/files/:name', async (req, res) => {
    const { name } = req.params;
    if (!fileStorage.isValidName(name) || !(await fileStorage.send(name, req, res))) {
      throw notFound('Arquivo não encontrado');
    }
  });
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
