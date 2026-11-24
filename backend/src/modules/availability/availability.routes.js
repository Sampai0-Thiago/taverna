import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { dateRangeQuery } from '../../utils/validators.js';
import { availabilityController as c } from './availability.controller.js';
import { bulkAvailabilitySchema } from './availability.schemas.js';

export const availabilityRoutes = Router();

availabilityRoutes.get('/', validate({ query: dateRangeQuery }), c.list);
availabilityRoutes.get('/summary', validate({ query: dateRangeQuery }), c.summary);
availabilityRoutes.put('/me', validate({ body: bulkAvailabilitySchema }), c.saveMine);
