import { usersService } from './users.service.js';

/** Controllers: traduzem HTTP ⇄ serviço. Sem regra de negócio. */
export const usersController = {
  list: async (_req, res) => res.json(await usersService.list()),
  get: async (req, res) => res.json(await usersService.get(req.valid.params.id)),
  updateMe: async (req, res) => res.json(await usersService.updateProfile(req.user.id, req.valid.body)),
  updatePreferences: async (req, res) =>
    res.json(await usersService.updatePreferences(req.user.id, req.valid.body)),
  updateAvatar: async (req, res) => res.json(await usersService.updateAvatar(req.user, req.uploaded.avatar)),
  changePassword: async (req, res) => {
    await usersService.changePassword(req.user.id, req.valid.body);
    res.status(204).end();
  },
  activateMaster: async (req, res) => res.json(await usersService.activateMaster(req.user, req.valid.body.token)),
  deactivateMaster: async (req, res) => res.json(await usersService.deactivateMaster(req.user)),
};
