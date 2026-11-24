import { charactersService } from './characters.service.js';

export const charactersController = {
  list: async (_req, res) => res.json(await charactersService.list()),
  get: async (req, res) => res.json(await charactersService.get(req.valid.params.id)),
  create: async (req, res) =>
    res.status(201).json(await charactersService.create(req.user, req.valid.body, req.uploaded)),
  update: async (req, res) =>
    res.json(await charactersService.update(req.user, req.valid.params.id, req.valid.body, req.uploaded)),
  remove: async (req, res) => {
    await charactersService.remove(req.user, req.valid.params.id);
    res.status(204).end();
  },
};
