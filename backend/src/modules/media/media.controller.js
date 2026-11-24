import { mediaService } from './media.service.js';

export const mediaController = {
  list: async (req, res) => res.json(await mediaService.list(req.valid.query.kind)),
  get: async (req, res) => res.json(await mediaService.get(req.valid.params.id)),
  create: async (req, res) =>
    res.status(201).json(await mediaService.create(req.user, req.valid.body, req.uploaded)),
  update: async (req, res) =>
    res.json(await mediaService.update(req.user, req.valid.params.id, req.valid.body, req.uploaded)),
  remove: async (req, res) => {
    await mediaService.remove(req.user, req.valid.params.id);
    res.status(204).end();
  },
  addPin: async (req, res) =>
    res.status(201).json(await mediaService.addPin(req.user, req.valid.params.id, req.valid.body)),
  removePin: async (req, res) => {
    await mediaService.removePin(req.user, req.valid.params.id, req.valid.params.pinId);
    res.status(204).end();
  },
};
