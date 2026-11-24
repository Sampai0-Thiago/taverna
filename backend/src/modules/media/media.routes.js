import { Router } from 'express';
import { requireRole } from '../../middlewares/auth.js';
import { uploadFields } from '../../middlewares/upload.js';
import { validate } from '../../middlewares/validate.js';
import { uuidParam } from '../../utils/validators.js';
import { mediaController as c } from './media.controller.js';
import { createMediaSchema, createPinSchema, listMediaQuery, pinParams, updateMediaSchema } from './media.schemas.js';

const imageUpload = uploadFields({ image: 'image' });

// Mapas e NPCs: todos visualizam; só quem está com o modo mestre ativo modifica.
// requireRole vem ANTES do upload, para jogadores não gravarem nada em disco.
const masterOnly = requireRole('master');

/** Mapas e NPCs compartilham o mesmo recurso, diferenciados por `kind`. */
export const mediaRoutes = Router();

mediaRoutes.get('/', validate({ query: listMediaQuery }), c.list);
mediaRoutes.get('/:id', validate({ params: uuidParam }), c.get);

mediaRoutes.post('/', masterOnly, imageUpload, validate({ body: createMediaSchema }), c.create);
mediaRoutes.patch('/:id', masterOnly, validate({ params: uuidParam }), imageUpload, validate({ params: uuidParam, body: updateMediaSchema }), c.update);
mediaRoutes.delete('/:id', masterOnly, validate({ params: uuidParam }), c.remove);
mediaRoutes.post('/:id/pins', masterOnly, validate({ params: uuidParam, body: createPinSchema }), c.addPin);
mediaRoutes.delete('/:id/pins/:pinId', masterOnly, validate({ params: pinParams }), c.removePin);
