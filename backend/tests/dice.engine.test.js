import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DiceError, parseExpression, rollExpression } from '../src/modules/dice/dice.engine.js';

/** RNG determinístico: devolve os valores da fila, em ordem. */
const fakeRng = (...values) => () => {
  if (!values.length) throw new Error('fila do rng vazia');
  return values.shift();
};

describe('parseExpression', () => {
  it('interpreta dados, modificadores e d%', () => {
    const p = parseExpression(' 2d6 + 1d4 - 1 ');
    assert.equal(p.normalized, '2d6+1d4-1');
    assert.equal(p.modifier, -1);
    assert.deepEqual(p.terms.filter((t) => t.type === 'dice').map((t) => [t.count, t.sides]), [[2, 6], [1, 4]]);
    assert.equal(parseExpression('d%').normalized, 'd100');
  });

  for (const bad of ['', 'abc', '2d', 'd1', '2d6 3', '101d6', '1d6+'.repeat(11) + '1', '2d6++3']) {
    it(`rejeita "${bad}"`, () => assert.throws(() => parseExpression(bad), DiceError));
  }
});

describe('rollExpression', () => {
  it('soma dados e modificador', () => {
    const r = rollExpression('2d6+3', { rng: fakeRng(4, 5) });
    assert.equal(r.total, 12);
    assert.deepEqual(r.groups[0].rolls, [4, 5]);
  });

  it('subtrai termos negativos', () => {
    assert.equal(rollExpression('1d8-1d4', { rng: fakeRng(6, 2) }).total, 4);
  });

  it('vantagem mantém o maior e desvantagem o menor', () => {
    const adv = rollExpression('1d20+2', { mode: 'advantage', rng: fakeRng(7, 15) });
    assert.equal(adv.total, 17);
    assert.deepEqual(adv.groups[0].dropped, [7]);
    const dis = rollExpression('1d20', { mode: 'disadvantage', rng: fakeRng(7, 15) });
    assert.equal(dis.total, 7);
  });

  it('exige 1d20 para vantagem', () => {
    assert.throws(() => rollExpression('2d6', { mode: 'advantage' }), DiceError);
  });

  it('marca crítico e falha crítica no d20', () => {
    assert.equal(rollExpression('d20+5', { rng: fakeRng(20) }).critical, 'success');
    assert.equal(rollExpression('d20', { rng: fakeRng(1) }).critical, 'failure');
    assert.equal(rollExpression('2d20', { rng: fakeRng(20, 20) }).critical, null);
  });

  it('com RNG real sempre fica dentro dos limites', () => {
    for (let i = 0; i < 500; i++) {
      const { total } = rollExpression('3d6');
      assert.ok(total >= 3 && total <= 18);
    }
  });
});
