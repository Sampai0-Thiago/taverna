import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { bruteForceLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { authController as c } from './auth.controller.js';
import { loginSchema, registerSchema } from './auth.schemas.js';

const authLimiter = bruteForceLimiter();

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate({ body: registerSchema }), c.register);
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), c.login);
authRoutes.post('/logout', c.logout);
authRoutes.get('/me', requireAuth, c.me);
