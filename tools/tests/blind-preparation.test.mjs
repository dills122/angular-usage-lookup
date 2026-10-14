import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as preparation from '../prepare-blind-trial.mjs';

async function temporary(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'lookup-preparation-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

test('preparation refuses identical input/private destinations before writing', async () => {
  await temporary(async root => {
    const destination = path.join(root, 'new');
    await assert.rejects(preparation.prepare(destination, destination, 'baseline'), /must be disjoint/);
    assert.deepEqual(await readdir(root), []);
  });
});

test('preparation refuses nested destinations in either direction without touching their contents', async () => {
  await temporary(async root => {
    const parent = path.join(root, 'existing');
    await mkdir(parent);
    await writeFile(path.join(parent, 'sentinel'), 'preserve');
    for (const [input, privateRoot] of [[parent, path.join(parent, 'child')], [path.join(parent, 'child'), parent]]) {
      await assert.rejects(preparation.prepare(input, privateRoot, 'baseline'), /must be disjoint/);
    }
    assert.deepEqual(await readdir(parent), ['sentinel']);
    assert.equal(await readFile(path.join(parent, 'sentinel'), 'utf8'), 'preserve');
  });
});

test('preparation resolves parent-directory symlinks before the disjointness check', async () => {
  await temporary(async root => {
    const real = path.join(root, 'real'), alias = path.join(root, 'alias');
    await mkdir(real);
    await symlink(real, alias, 'dir');
    await assert.rejects(preparation.prepare(path.join(real, 'new'), path.join(alias, 'new'), 'baseline'), /must be disjoint/);
    assert.deepEqual(await readdir(real), []);
  });
});

test('preparation requires both destinations to be new, including a dangling destination symlink', async () => {
  await temporary(async root => {
    const existing = path.join(root, 'existing');
    await mkdir(existing);
    await writeFile(path.join(existing, 'sentinel'), 'preserve');
    for (const [input, privateRoot] of [[existing, path.join(root, 'new')], [path.join(root, 'new'), existing]]) {
      await assert.rejects(preparation.prepare(input, privateRoot, 'baseline'), /must be new/);
    }
    const dangling = path.join(root, 'dangling');
    await symlink(path.join(root, 'absent'), dangling, 'dir');
    await assert.rejects(preparation.prepare(dangling, path.join(root, 'new'), 'baseline'), /must be new/);
    assert.equal(await readFile(path.join(existing, 'sentinel'), 'utf8'), 'preserve');
    assert.deepEqual((await readdir(root)).sort(), ['dangling', 'existing']);
  });
});

test('preparation rejects unknown variants before creating or copying anything', async () => {
  await temporary(async root => {
    await assert.rejects(preparation.prepare(path.join(root, 'input'), path.join(root, 'private'), 'unexpected'), /Unknown fixture variant/);
    assert.deepEqual(await readdir(root), []);
  });
});

test('fresh-agent request carries only public identities and the evidence/output contract', () => {
  assert.equal(typeof preparation.trialRequest, 'function');
  const input = path.resolve('/tmp/example-trial');
  const targets = {
    card: { symbol: 'ExamplePane', file: 'packages/surfaces/src/card.ts', occurrences: ['DO_NOT_DISCLOSE'] },
    option: { symbol: 'MatOption', package: '@angular/material/core' },
    padding: { symbol: 'MatTreeNodePadding', package: '@angular/material/tree' },
  };
  const request = preparation.trialRequest(input, targets);
  for (const text of ['ExamplePane', 'packages/surfaces/src/card.ts', 'MatOption', '@angular/material/core',
    'MatTreeNodePadding', '@angular/material/tree', path.join(input, 'installed/angular-usage-lookup/SKILL.md'),
    path.join(input, 'workspace'), path.join(input, 'output'), 'inventory.json', 'UTF-16', 'half-open',
    'failed attempts', 'native evidence', 'leaf', 'read-only', 'outside', 'graph']) assert.ok(request.includes(text), text);
  assert.match(request, /app.*librar.*test.*stor/i);
  assert.match(request, /confirmed active static template sites/);
  assert.match(request, /full opening.*tag/);
  assert.match(request, /status.*reason/);
  assert.ok(!request.includes('DO_NOT_DISCLOSE'));
  assert.ok(!request.includes('baseline'));
  assert.ok(!request.includes('transformed'));
});
