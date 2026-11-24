import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eachDate, rankBestDates, summarizeAvailability } from '../src/modules/availability/availability.summary.js';

const members = ['ana', 'bia', 'caio'];

describe('eachDate', () => {
  it('inclui as pontas e atravessa meses', () => {
    assert.deepEqual(eachDate('2026-01-30', '2026-02-02'), ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });
});

describe('summarizeAvailability', () => {
  const entries = [
    { userId: 'ana', date: '2026-12-05', status: 'available' },
    { userId: 'bia', date: '2026-12-05', status: 'available' },
    { userId: 'caio', date: '2026-12-05', status: 'available' },
    { userId: 'ana', date: '2026-12-06', status: 'available' },
    { userId: 'bia', date: '2026-12-06', status: 'unavailable' },
    { userId: 'ana', date: '2026-12-07', status: 'maybe' },
  ];
  const days = summarizeAvailability({ entries, memberIds: members, from: '2026-12-05', to: '2026-12-08' });

  it('gera um registro por dia do intervalo', () => assert.equal(days.length, 4));

  it('classifica cada membro', () => {
    assert.equal(days[0].allAvailable, true);
    assert.deepEqual(days[1].unavailable, ['bia']);
    assert.deepEqual(days[1].pending, ['caio']);
    assert.deepEqual(days[3].pending, members);
  });

  it('ranqueia melhores datas: sem indisponíveis primeiro', () => {
    const best = rankBestDates(days);
    assert.deepEqual(best.map((d) => d.date), ['2026-12-05', '2026-12-06']);
  });

  it('ignora datas passadas', () => {
    assert.deepEqual(rankBestDates(days, { notBefore: '2026-12-06' }).map((d) => d.date), ['2026-12-06']);
  });
});
