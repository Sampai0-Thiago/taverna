import { Router } from 'express';
import { bruteForceLimiter } from '../../middlewares/rateLimit.js';
import { uploadFields } from '../../middlewares/upload.js';
import { validate } from '../../middlewares/validate.js';
import { usersController as c } from './users.controller.js';
import {
  changePasswordSchema,
  preferencesSchema,
  activateMasterSchema,
  updateProfileSchema,
  uuidParam,
} from './users.schemas.js';

export const usersRoutes = Router();

usersRoutes.get('/', c.list);
usersRoutes.patch('/me', validate({ body: updateProfileSchema }), c.updateMe);
usersRoutes.patch('/me/preferences', validate({ body: preferencesSchema }), c.updatePreferences);
usersRoutes.patch('/me/password', validate({ body: changePasswordSchema }), c.changePassword);
usersRoutes.put('/me/avatar', uploadFields({ avatar: 'image' }), c.updateAvatar);
usersRoutes.get('/:id', validate({ params: uuidParam }), c.get);
// Modo mestre: ativar com o token (com limite de tentativas) e desativar
usersRoutes.post('/me/master', bruteForceLimiter({ limit: 10 }), validate({ body: activateMasterSchema }), c.activateMaster);
usersRoutes.delete('/me/master', c.deactivateMaster);
