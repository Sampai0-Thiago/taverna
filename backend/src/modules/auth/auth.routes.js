import { Router } from 'express';
import { requireAuthAllowUnverified } from '../../middlewares/auth.js';
import { bruteForceLimiter } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import { authController as c } from './auth.controller.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.schemas.js';

const authLimiter = bruteForceLimiter();

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate({ body: registerSchema }), c.register);
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), c.login);
authRoutes.post('/logout', c.logout);

// Recuperação de senha por código enviado ao e-mail
const resetLimiter = bruteForceLimiter({ limit: 20 }); // pedir código + tentativas (cada código aceita só 5)
authRoutes.post('/forgot-password', resetLimiter, validate({ body: forgotPasswordSchema }), c.forgotPassword);
authRoutes.post('/reset-password', resetLimiter, validate({ body: resetPasswordSchema }), c.resetPassword);
authRoutes.get('/me', requireAuthAllowUnverified, c.me);

// Confirmação de e-mail (o usuário já está logado, mas ainda não confirmou)
const verifyLimiter = bruteForceLimiter({ limit: 15 });
authRoutes.post('/verify-email', verifyLimiter, requireAuthAllowUnverified, validate({ body: verifyEmailSchema }), c.verifyEmail);
authRoutes.post('/resend-verification', verifyLimiter, requireAuthAllowUnverified, c.resendVerification);
