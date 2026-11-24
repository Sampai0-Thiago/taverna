import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { diceController as c } from './dice.controller.js';
import { historyQuery, rollSchema } from './dice.schemas.js';

export const diceRoutes = Router();

diceRoutes.get('/rolls', validate({ query: historyQuery }), c.history);
diceRoutes.post('/rolls', validate({ body: rollSchema }), c.roll);
