import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { PRIVACY_POLICY_VERSION } from './config/privacy.js';
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
/** Caminho completo da requisição, sem query string (o Express encurta req.url dentro dos sub-roteadores). */
const routeOf = (req) => (req.originalUrl ?? req.url ?? '').split('?')[0];

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
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      // LGPD (necessidade): o log de acesso guarda só o essencial para diagnóstico.
      // Sem IP, cabeçalhos, cookies, navegador nem query string (que pode ter dados pessoais).
      serializers: {
        req: (req) => ({ method: req.method, path: routeOf(req.raw ?? req) }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customSuccessMessage: (req, res) => `${req.method} ${routeOf(req)} ${res.statusCode}`,
      customErrorMessage: (req, res) => `${req.method} ${routeOf(req)} ${res.statusCode}`,
    }),
  );

  // ---- Rotas públicas ----
  app.get('/api/health', async (_req, res) => {
    await query('SELECT 1');
    res.json({ status: 'ok', time: new Date().toISOString() });
  });
  // Dados públicos da Política de Privacidade (controlador e canal de contato)
  app.get('/api/legal', (_req, res) => {
    res.json({ controller: env.appName, contactEmail: env.privacyContact, policyVersion: PRIVACY_POLICY_VERSION });
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
