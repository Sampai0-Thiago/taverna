import { badRequest } from '../../utils/errors.js';
import { toUserRef } from '../users/users.mapper.js';
import { DiceError, rollExpression } from './dice.engine.js';
import { diceRepository } from './dice.repository.js';

/*
 * As rolagens são feitas NO SERVIDOR (ninguém "rola" pelo console do navegador)
 * e ficam registradas num histórico compartilhado do grupo.
 */
function toRollDTO(row) {
  // Colunas JSON já chegam como objeto; o fallback cobre drivers/servidores que devolvem texto.
  const detail = typeof row.detail === 'string' ? JSON.parse(row.detail) : row.detail;
  return {
    id: row.id,
    expression: row.expression,
    mode: row.mode,
    groups: detail.groups,
    modifier: detail.modifier,
    critical: detail.critical,
    total: row.total,
    context: row.context,
    user: toUserRef(row.user_id, row.user_name, row.user_color, row.user_avatar),
    createdAt: row.created_at,
  };
}

export const diceService = {
  async roll(user, { expression, mode, context }) {
    let result;
    try {
      result = rollExpression(expression, { mode });
    } catch (error) {
      if (error instanceof DiceError) throw badRequest(error.message);
      throw error;
    }
    const row = await diceRepository.insert({
      userId: user.id,
      expression: result.expression,
      mode,
      detail: { groups: result.groups, modifier: result.modifier, critical: result.critical },
      total: result.total,
      context,
    });
    return toRollDTO(row);
  },

  async history({ limit, after }) {
    return (await diceRepository.recent(limit, after)).map(toRollDTO);
  },
};
