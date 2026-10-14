import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { generate, logicalInventory } from './workspace.mjs';

test('transformed fixtures preserve authored semantic sites and config roles without leaking grading data', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'blind-fixture-test-'));
  try {
    const variants = await Promise.all(['baseline', 'transformed'].map(variant => generate(path.join(root, variant), variant)));
    assert.deepEqual(logicalInventory(variants[0]), logicalInventory(variants[1]));
    assert.equal(variants[0].occurrences.length, 36);
    assert.equal(variants[0].configs.length, 8);
    for (const [i, variant] of variants.entries()) {
      const workspace = path.join(root, ['baseline', 'transformed'][i]);
      const files = await readdir(workspace, { recursive: true });
      assert.ok(!files.some(f => /oracle|expected|lookup|manifest|answer/.test(f)));
      for (const occurrence of variant.occurrences) {
        const source = await readFile(path.join(workspace, occurrence.file), 'utf8');
        const line = source.split('\n')[occurrence.range.start.line - 1];
        assert.equal(line.slice(occurrence.range.start.column - 1, occurrence.range.end.column - 1), occurrence.text);
      }
    }
    assert.notDeepEqual(variants[0].occurrences.map(r => [r.file, r.range]), variants[1].occurrences.map(r => [r.file, r.range]));
  } finally { await rm(root, { recursive: true, force: true }); }
});
