import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { claimTransition, releaseTransition, statusTransition } from '../src/modules/tavern/tavern.rules.js';

const player = { id: 'p1', role: 'player' };
const other = { id: 'p2', role: 'player' };
const master = { id: 'm1', role: 'master' };

describe('regras da Taverna', () => {
  it('assume item aberto', () => {
    assert.deepEqual(claimTransition({ status: 'open' }, player), { status: 'claimed', assignedTo: 'p1' });
  });

  it('não assume item já reservado', () => {
    assert.throws(() => claimTransition({ status: 'claimed', assigned_to: 'p2' }, player), { status: 409 });
  });

  it('só responsável ou mestre liberam', () => {
    const item = { status: 'claimed', assigned_to: 'p1' };
    assert.throws(() => releaseTransition(item, other), { status: 403 });
    assert.deepEqual(releaseTransition(item, master), { status: 'open', assignedTo: null });
  });

  it('marca como comprado mantendo o responsável', () => {
    assert.deepEqual(statusTransition({ status: 'claimed', assigned_to: 'p1' }, player, 'bought'), {
      status: 'bought',
      assignedTo: 'p1',
    });
    assert.throws(() => statusTransition({ status: 'open' }, player, 'bought'), { status: 409 });
  });
});
