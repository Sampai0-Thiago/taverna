import { tavernService } from './tavern.service.js';

export const tavernController = {
  list: async (req, res) => res.json(await tavernService.list(req.valid.query.sessionId)),
  create: async (req, res) => res.status(201).json(await tavernService.create(req.user, req.valid.body)),
  update: async (req, res) => res.json(await tavernService.update(req.user, req.valid.params.id, req.valid.body)),
  claim: async (req, res) => res.json(await tavernService.claim(req.user, req.valid.params.id)),
  release: async (req, res) => res.json(await tavernService.release(req.user, req.valid.params.id)),
  setStatus: async (req, res) =>
    res.json(await tavernService.setStatus(req.user, req.valid.params.id, req.valid.body.status)),
  remove: async (req, res) => {
    await tavernService.remove(req.user, req.valid.params.id);
    res.status(204).end();
  },
};
