import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { collect } from '../scripts/collect-references.mjs';

const workspace = fileURLToPath(new URL('./fixtures/binding-collision/', import.meta.url));
const manifest = occurrence => ({ target: { file: 'types.ts', symbol: 'Target', member: 'value' }, projects: [{
  name: 'one', tsconfig: 'tsconfig.json', anchor: { file: 'types.ts' }, probes: [{ file: 'types.ts', text: 'shared]="', occurrence }],
}] });

test('a shared public binding cannot qualify a union of different members', async () => {
  const report = await collect(workspace, manifest(0));
  assert.equal(report.collectionStatus, 'failed');
  assert.equal(report.coverage[0].probes[0].definitions.length, 2);
  assert.equal(report.coverage[0].probes[0].resolvesToTarget, false);
  assert.match(report.coverage[0].error, /ambiguous|identity/i);
  assert.deepEqual(report.references, []);
  assert.ok(report.coverage[0].process.exited);
});

test('a uniquely resolved binding recovers only this member, including its shared-element use', async () => {
  const report = await collect(workspace, manifest(2));
  assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.gaps));
  const spans = report.references.map(r => `${r.file}:${r.range.start.line}:${r.range.start.column}-${r.range.end.line}:${r.range.end.column}`).sort();
  // Authored declaration and two target binding locations; Other's declaration
  // (3:72) and other-only binding (4:95) are forbidden despite matching aliases.
  assert.deepEqual(spans, ['types.ts:2:74-2:79', 'types.ts:4:126-4:132', 'types.ts:4:65-4:71'].sort());
  assert.ok(report.coverage[0].process.exited);
});
