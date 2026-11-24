import { sessionsService } from './sessions.service.js';

export const sessionsController = {
  list: async (req, res) => res.json(await sessionsService.list(req.valid.query)),
  get: async (req, res) => res.json(await sessionsService.get(req.valid.params.id)),
  create: async (req, res) => res.status(201).json(await sessionsService.create(req.user, req.valid.body)),
  update: async (req, res) =>
    res.json(await sessionsService.update(req.user, req.valid.params.id, req.valid.body)),
  remove: async (req, res) => {
    await sessionsService.remove(req.user, req.valid.params.id);
    res.status(204).end();
  },
};
