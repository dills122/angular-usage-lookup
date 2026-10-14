import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { collect } from '../scripts/collect-references.mjs';

const require = createRequire(import.meta.url);

test('TypeScript collection survives an incompatible Angular server, including mixed manifests', async () => {
  const workspace = await realpath(await mkdtemp(path.join(tmpdir(), 'lookup-backends-')));
  try {
    await mkdir(path.join(workspace, 'node_modules/@angular/language-server'), { recursive: true });
    await symlink(path.dirname(require.resolve('typescript/package.json')), path.join(workspace, 'node_modules/typescript'));
    await symlink(path.dirname(require.resolve('@angular/core/package.json')), path.join(workspace, 'node_modules/@angular/core'));
    await writeFile(path.join(workspace, 'node_modules/@angular/language-server/package.json'), JSON.stringify({ version: '19.0.0' }));
    await writeFile(path.join(workspace, 'package.json'), '{}');
    await writeFile(path.join(workspace, 'target.ts'), 'export class Target {}\n');
    await writeFile(path.join(workspace, 'consumer.ts'), "import { Target } from './target';\nexport const instance = new Target();\n");
    await writeFile(path.join(workspace, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022' }, files: ['target.ts', 'consumer.ts'] }));
    const project = { name: 'ts', backend: 'typescript', tsconfig: 'tsconfig.json', anchor: { file: 'consumer.ts' }, probes: [{ file: 'consumer.ts', text: 'Target' }] };
    const manifest = { target: { file: 'target.ts', symbol: 'Target' }, projects: [project] };
    const report = await collect(workspace, manifest);
    assert.equal(report.collectionStatus, 'succeeded');
    assert.equal(report.references.filter(r => r.file === 'consumer.ts').length, 2);
    assert.equal(report.run.versions.languageServer, null, 'Unused server is not resolved or reported as used');
    assert.equal(report.coverage[0].process, undefined);
    assert.ok(report.gaps.some(g => g.code === 'templates-not-analyzed'));
    const mixed = await collect(workspace, { ...manifest, projects: [{ ...project, name: 'ng', backend: 'angular' }, project] });
    assert.equal(mixed.collectionStatus, 'failed');
    assert.equal(mixed.coverage[0].result, 'failed');
    assert.match(mixed.coverage[0].error, /requires language-server/);
    assert.equal(mixed.coverage[1].result, 'verified');
    assert.equal(mixed.references.filter(r => r.file === 'consumer.ts').length, 2);
  } finally { await rm(workspace, { recursive: true, force: true }); }
});
