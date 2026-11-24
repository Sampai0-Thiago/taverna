import { randomInt } from 'node:crypto';

/**
 * Motor de dados — puro e determinístico quando recebe um `rng` (usado nos testes).
 * Em produção usa crypto.randomInt (aleatoriedade criptográfica, sem viés de módulo).
 *
 * Notação suportada: "d20", "2d6+3", "1d8+1d6-1", "d%" (= d100). Espaços são ignorados.
 */
export const LIMITS = Object.freeze({ maxTerms: 10, maxDice: 100, maxSides: 1000, maxModifier: 1000 });

export class DiceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DiceError';
  }
}

const secureRng = (min, max) => randomInt(min, max + 1);
const TERM = /([+-])?(?:(\d*)d(\d+|%)|(\d+))/gy;

export function parseExpression(input) {
  // Remove espaços só ao redor de + e -: "2d6 3" continua inválido (não vira "2d63").
  const expr = String(input ?? '').toLowerCase().trim().replace(/\s*([+-])\s*/g, '$1');
  if (!expr) throw new DiceError('Expressão vazia.');
  if (/\s/.test(expr)) throw new DiceError('Use + ou - entre os termos.');

  const terms = [];
  TERM.lastIndex = 0;
  let match;
  while (TERM.lastIndex < expr.length && (match = TERM.exec(expr))) {
    const [, signChar, countStr, sidesStr, flat] = match;
    if (terms.length > 0 && !signChar) throw new DiceError('Use + ou - entre os termos.');
    const sign = signChar === '-' ? -1 : 1;

    if (flat !== undefined) {
      terms.push({ type: 'flat', sign, value: Number(flat) });
    } else {
      const count = countStr === '' ? 1 : Number(countStr);
      const sides = sidesStr === '%' ? 100 : Number(sidesStr);
      if (count < 1) throw new DiceError('Quantidade de dados deve ser pelo menos 1.');
      if (sides < 2 || sides > LIMITS.maxSides) throw new DiceError(`Dados devem ter entre 2 e ${LIMITS.maxSides} faces.`);
      terms.push({ type: 'dice', sign, count, sides });
    }
  }
  if (TERM.lastIndex !== expr.length || terms.length === 0) {
    throw new DiceError(`Expressão inválida: "${input}". Exemplo válido: 2d6+3`);
  }
  if (terms.length > LIMITS.maxTerms) throw new DiceError(`Máximo de ${LIMITS.maxTerms} termos.`);

  const totalDice = terms.filter((t) => t.type === 'dice').reduce((n, t) => n + t.count, 0);
  if (totalDice > LIMITS.maxDice) throw new DiceError(`Máximo de ${LIMITS.maxDice} dados por rolagem.`);

  const modifier = terms.filter((t) => t.type === 'flat').reduce((n, t) => n + t.sign * t.value, 0);
  if (Math.abs(modifier) > LIMITS.maxModifier) throw new DiceError('Modificador grande demais.');

  return { normalized: expr.replace('d%', 'd100'), terms, modifier };
}

/**
 * Rola uma expressão.
 * @param {string} expression
 * @param {{ mode?: 'normal'|'advantage'|'disadvantage', rng?: (min:number,max:number)=>number }} [options]
 *   Vantagem/desvantagem se aplicam a cada termo "1d20": rola dois e mantém o maior/menor.
 */
export function rollExpression(expression, { mode = 'normal', rng = secureRng } = {}) {
  const { normalized, terms, modifier } = parseExpression(expression);
  const diceTerms = terms.filter((t) => t.type === 'dice');
  const isD20Single = (t) => t.count === 1 && t.sides === 20;

  if (mode !== 'normal' && !diceTerms.some(isD20Single)) {
    throw new DiceError('Vantagem/desvantagem exigem um termo 1d20.');
  }

  const groups = diceTerms.map((term) => {
    const notation = `${term.count}d${term.sides}`;
    if (mode !== 'normal' && isD20Single(term)) {
      const pair = [rng(1, 20), rng(1, 20)];
      const kept = mode === 'advantage' ? Math.max(...pair) : Math.min(...pair);
      const dropped = pair[0] === kept ? pair[1] : pair[0];
      return { notation, sign: term.sign, sides: 20, rolls: [kept], dropped: [dropped], subtotal: term.sign * kept };
    }
    const rolls = Array.from({ length: term.count }, () => rng(1, term.sides));
    const sum = rolls.reduce((a, b) => a + b, 0);
    return { notation, sign: term.sign, sides: term.sides, rolls, dropped: [], subtotal: term.sign * sum };
  });

  const total = groups.reduce((n, g) => n + g.subtotal, 0) + modifier;

  // Crítico/falha natural: só faz sentido numa rolagem com um único d20 mantido
  const d20 = groups.length === 1 && groups[0].sides === 20 && groups[0].rolls.length === 1 ? groups[0].rolls[0] : null;

  return {
    expression: normalized,
    mode,
    groups,
    modifier,
    total,
    critical: d20 === 20 ? 'success' : d20 === 1 ? 'failure' : null,
  };
}
