import { diceService } from './dice.service.js';

export const diceController = {
  history: async (req, res) => res.json(await diceService.history(req.valid.query)),
  roll: async (req, res) => res.status(201).json(await diceService.roll(req.user, req.valid.body)),
};
