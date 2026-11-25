import { AUTH_COOKIE, cookieOptions } from '../auth/token.js';
import { privacyService } from './privacy.service.js';

export const privacyController = {
  /** Download do JSON com todos os dados da pessoa. */
  exportMine: async (req, res) => {
    const data = await privacyService.exportData(req.user.id);
    const day = new Date().toISOString().slice(0, 10);
    res
      .set('Cache-Control', 'no-store')
      .attachment(`meus-dados-gremad-${day}.json`)
      .type('application/json')
      .send(JSON.stringify(data, null, 2));
  },

  deleteMine: async (req, res) => {
    await privacyService.deleteAccount(req.user.id, req.valid.body.password);
    const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie(AUTH_COOKIE, clearOptions).status(204).end();
  },
};
