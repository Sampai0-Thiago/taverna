import { toUserDTO } from '../users/users.mapper.js';
import { authService } from './auth.service.js';
import { emailVerificationService } from './emailVerification.service.js';
import { AUTH_COOKIE, cookieOptions } from './token.js';

export const authController = {
  register: async (req, res) => {
    const { user, token } = await authService.register(req.valid.body);
    res.cookie(AUTH_COOKIE, token, cookieOptions).status(201).json(user);
  },

  login: async (req, res) => {
    const { user, token } = await authService.login(req.valid.body);
    res.cookie(AUTH_COOKIE, token, cookieOptions).json(user);
  },

  logout: (_req, res) => {
    const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie(AUTH_COOKIE, clearOptions).status(204).end();
  },

  me: (req, res) => res.json(toUserDTO(req.user, { includeEmail: true })),

  verifyEmail: async (req, res) => {
    res.json(await emailVerificationService.verify(req.user, req.valid.body.code));
  },

  resendVerification: async (req, res) => {
    await emailVerificationService.sendCode(req.user);
    res.status(204).end();
  },
};
