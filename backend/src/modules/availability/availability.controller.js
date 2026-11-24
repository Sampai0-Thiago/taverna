import { availabilityService } from './availability.service.js';

export const availabilityController = {
  list: async (req, res) => res.json(await availabilityService.list(req.valid.query)),
  summary: async (req, res) => res.json(await availabilityService.summary(req.valid.query)),
  saveMine: async (req, res) => {
    await availabilityService.saveMine(req.user.id, req.valid.body.entries);
    res.status(204).end();
  },
};
