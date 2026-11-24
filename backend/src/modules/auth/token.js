import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export const AUTH_COOKIE = 'odc_token';

export function signToken(user) {
  return jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

/** Cookie httpOnly: inacessível a JavaScript (mitiga roubo de token via XSS). */
export const cookieOptions = Object.freeze({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
