import { Router } from 'express';
import { uploadFields } from '../../middlewares/upload.js';
import { validate } from '../../middlewares/validate.js';
import { uuidParam } from '../../utils/validators.js';
import { charactersController as c } from './characters.controller.js';
import { createCharacterSchema, updateCharacterSchema } from './characters.schemas.js';

const characterFiles = uploadFields({ portrait: 'image', sheet: 'pdf' });

export const charactersRoutes = Router();

charactersRoutes.get('/', c.list);
charactersRoutes.post('/', characterFiles, validate({ body: createCharacterSchema }), c.create);
charactersRoutes.get('/:id', validate({ params: uuidParam }), c.get);
charactersRoutes.patch('/:id', validate({ params: uuidParam }), characterFiles, validate({ params: uuidParam, body: updateCharacterSchema }), c.update);
charactersRoutes.delete('/:id', validate({ params: uuidParam }), c.remove);
