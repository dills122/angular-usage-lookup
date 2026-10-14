import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareInventory } from './scoring.mjs';

const occurrence = { id: 'one', target: 'card', file: 'app.ts', range: { start: { line: 2, column: 3 }, end: { line: 2, column: 14 } }, contexts: ['app.json', 'spec.json'] };
const oracle = { targets: { card: { symbol: 'Card' }, unused: { symbol: 'Unused' } }, occurrences: [occurrence], configs: [{ file: 'app.json' }, { file: 'spec.json' }] };
const submission = () => ({ targets: { card: [{ ...occurrence, evidence: ['raw.json'] }], unused: [] }, coverage: [{ tsconfig: 'app.json', status: 'verified', evidence: ['raw.json'] }, { tsconfig: 'spec.json', status: 'verified', evidence: ['raw.json'] }] });
test('grading passes exact sets, including explicitly empty targets', () => assert.equal(compareInventory(oracle, submission()).passed, true));
test('coordinate object property order has no effect on grading', () => {
  const actual = submission();
  actual.targets.card[0].range = { end: { column: 14, line: 2 }, start: { column: 3, line: 2 } };
  assert.equal(compareInventory(oracle, actual).passed, true);
});
test('equal totals cannot hide wrong locations or contexts', () => {
  for (const patch of [{ file: 'decoy.ts' }, { contexts: ['app.json'] }]) {
    const actual = submission(); Object.assign(actual.targets.card[0], patch);
    assert.equal(compareInventory(oracle, actual).passed, false);
  }
});
test('grading fails missing scope, unrecognized targets and unlinked claims', () => {
  for (const mutate of [s => s.coverage.pop(), s => { s.targets.foreign = []; }, s => { s.targets.card[0].evidence = []; }]) {
    const actual = submission(); mutate(actual); assert.equal(compareInventory(oracle, actual).passed, false);
  }
});
test('duplicate records cannot inflate precision or silently lose context pairs', () => {
  const actual = submission(); actual.targets.card.push(structuredClone(actual.targets.card[0]));
  const score = compareInventory(oracle, actual);
  assert.equal(score.targets.card.actualLocations, 1);
  assert.equal(score.targets.card.actualContextPairs, 2);
  assert.equal(score.passed, false, 'Final inventories must be deduplicated');
});
test('matching config names with failed or unlinked coverage cannot fully pass', () => {
  for (const mutate of [s => { s.coverage[0].status = 'failed'; }, s => { s.coverage[1].evidence = []; }]) {
    const actual = submission(); mutate(actual);
    assert.equal(compareInventory(oracle, actual).passed, false);
  }
});
test('analyzed coverage preserves exact inventory metrics while capability gaps remain partial', () => {
  const actual = submission(); actual.coverage.forEach(row => { row.status = 'analyzed'; });
  assert.equal(compareInventory(oracle, actual).passed, true);
  actual.coverage[0].status = 'analyzed-with-capability-gap';
  const score = compareInventory(oracle, actual);
  assert.equal(score.passed, false);
  assert.equal(score.targets.card.passed, true);
  assert.equal(score.targets.card.actualLocations, 1);
  assert.equal(score.targets.card.actualContextPairs, 2);
});
