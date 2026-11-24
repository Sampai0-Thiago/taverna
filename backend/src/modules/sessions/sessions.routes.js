import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { uuidParam } from '../../utils/validators.js';
import { sessionsController as c } from './sessions.controller.js';
import { createSessionSchema, listSessionsQuery, updateSessionSchema } from './sessions.schemas.js';

export const sessionsRoutes = Router();

sessionsRoutes.get('/', validate({ query: listSessionsQuery }), c.list);
sessionsRoutes.post('/', validate({ body: createSessionSchema }), c.create);
sessionsRoutes.get('/:id', validate({ params: uuidParam }), c.get);
sessionsRoutes.patch('/:id', validate({ params: uuidParam, body: updateSessionSchema }), c.update);
sessionsRoutes.delete('/:id', validate({ params: uuidParam }), c.remove);
