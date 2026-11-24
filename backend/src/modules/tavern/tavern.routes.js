import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { uuidParam } from '../../utils/validators.js';
import { tavernController as c } from './tavern.controller.js';
import { createItemSchema, listItemsQuery, statusSchema, updateItemSchema } from './tavern.schemas.js';

export const tavernRoutes = Router();

tavernRoutes.get('/items', validate({ query: listItemsQuery }), c.list);
tavernRoutes.post('/items', validate({ body: createItemSchema }), c.create);
tavernRoutes.patch('/items/:id', validate({ params: uuidParam, body: updateItemSchema }), c.update);
tavernRoutes.post('/items/:id/claim', validate({ params: uuidParam }), c.claim);
tavernRoutes.post('/items/:id/release', validate({ params: uuidParam }), c.release);
tavernRoutes.patch('/items/:id/status', validate({ params: uuidParam, body: statusSchema }), c.setStatus);
tavernRoutes.delete('/items/:id', validate({ params: uuidParam }), c.remove);
