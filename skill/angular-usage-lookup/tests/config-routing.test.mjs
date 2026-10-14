import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { collect } from '../scripts/collect-references.mjs';

const workspace = fileURLToPath(new URL('./fixtures/config-overlap/', import.meta.url));
const manifest = JSON.parse(await readFile(`${workspace}/lookup.json`, 'utf8'));
const key = r => `${r.file}:${r.range.start.line}:${r.range.start.column}-${r.range.end.line}:${r.range.end.column}`;

test('overlapping configs query the spec program: exact spans, no app-only substitutions', async () => {
  const report = await collect(workspace, manifest);
  const wanted = JSON.parse(await readFile(`${workspace}/expected-locations.json`, 'utf8'));
  assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.gaps));
  assert.deepEqual(report.references.map(key).sort(), wanted.map(key).sort());
  assert.equal(report.coverage[0].queryConfigEvidence.queryFile, 'src/spec.ts');
  assert.ok(report.coverage[0].process.exited);
});

test('a probe shared by enabled app/spec programs fails closed', async () => {
  const input = structuredClone(manifest);
  input.projects[0].probes = [{ file: 'src/inline.ts', text: '<super-cool', offset: 1 }];
  const report = await collect(workspace, input);
  assert.equal(report.collectionStatus, 'failed');
  assert.match(report.coverage[0].error, /unambiguous.*config/i);
  assert.deepEqual(report.references, []);
  assert.ok(report.coverage[0].process.exited);
});

test('foreign project probes cannot qualify a config', async () => {
  const root = fileURLToPath(new URL('./fixtures/nx-two/', import.meta.url));
  const input = JSON.parse(await readFile(`${root}/lookup.json`, 'utf8'));
  input.projects[0].probes = input.projects[1].probes;
  input.projects = [input.projects[0]];
  const report = await collect(root, input);
  assert.equal(report.collectionStatus, 'failed');
  assert.match(report.coverage[0].error, /owner.*root file/i);
  assert.deepEqual(report.references, []);
});

test('no positive probe is a coverage gap, never a successful zero-use result', async () => {
  const input = structuredClone(manifest);
  input.projects[0].probes = [];
  const report = await collect(workspace, input);
  assert.equal(report.collectionStatus, 'failed');
  assert.match(report.coverage[0].error, /known reference probe/);
  assert.deepEqual(report.references, []);
});

test('one HTML file with two scoped owners remains unresolved', async () => {
  const root = fileURLToPath(new URL('../test-output/shared-template/', import.meta.url));
  await mkdir(root, { recursive: true });
  await writeFile(`${root}/package.json`, '{"private":true}');
  await writeFile(`${root}/tsconfig.json`, JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true }, angularCompilerOptions: { strictTemplates: true }, include: ['*.ts'] }));
  await writeFile(`${root}/shared.html`, '<shared-target />');
  await writeFile(`${root}/types.ts`, `import {Component} from '@angular/core';
@Component({selector:'shared-target',template:''}) export class Target {}
@Component({selector:'shared-target',template:''}) export class Other {}
@Component({imports:[Target],templateUrl:'./shared.html'}) export class First {}
@Component({imports:[Other],templateUrl:'./shared.html'}) export class Second {}
`);
  const report = await collect(root, { target: { file: 'types.ts', symbol: 'Other' }, projects: [{ name: 'shared-template', tsconfig: 'tsconfig.json',
    anchor: { file: 'types.ts' }, probes: [{ file: 'shared.html', owner: 'types.ts', text: 'shared-target' }] }] });
  assert.equal(report.collectionStatus, 'failed');
  assert.match(report.coverage[0].error, /unambiguous.*config/);
  assert.equal(report.coverage[0].probes[0].templateOwners.length, 2);
  assert.deepEqual(report.references, []);
});
