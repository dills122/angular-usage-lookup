import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collect } from '../scripts/collect-references.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const opening = '<context-card [value]="1">';
const hash = source => createHash('sha256').update(source).digest('hex');

async function fixture(run) {
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'test-output/compiler-context-'));
  const files = {
    'package.json': '{}',
    'tsconfig.base.json': JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
        experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true },
      angularCompilerOptions: { strictTemplates: true },
    }),
    'tsconfig.json': JSON.stringify({ files: [], references: ['app', 'spec', 'story'].map(kind => ({ path: `./tsconfig.${kind}.json` })) }),
    'tsconfig.app.json': JSON.stringify({ extends: './tsconfig.base.json', files: ['shared.ts', 'outside.ts'] }),
    'tsconfig.spec.json': JSON.stringify({ extends: './tsconfig.base.json', files: ['spec.ts'] }),
    'tsconfig.story.json': JSON.stringify({ extends: './tsconfig.base.json', files: ['story.ts'] }),
    'target.ts': `import { Component, input } from '@angular/core';
@Component({selector: 'context-card', template: ''})
export class ContextCard<T = unknown> { value = input<T>(); }
`,
    'shared.ts': `import { Component } from '@angular/core';
import { ContextCard } from './target';
@Component({imports: [ContextCard], template: '${opening}</context-card>'})
export class SharedInline {}
@Component({imports: [ContextCard], templateUrl: './shared.html'})
export class SharedExternal {}
`,
    'shared.html': `${opening}</context-card>`,
    'wrong.ts': `import { Component } from '@angular/core';
@Component({template: ''}) export class WrongOwner {}
`,
    'outside.ts': `import { Component } from '@angular/core';
import { ContextCard } from './target';
@Component({imports: [ContextCard], template: '${opening}</context-card>'})
export class OutsideOwner {}
`,
  };
  for (const kind of ['spec', 'story']) files[`${kind}.ts`] = `import { Component } from '@angular/core';
import { ContextCard } from './target';
import { SharedInline, SharedExternal } from './shared';
import { WrongOwner } from './wrong';
export const registrations = [SharedInline, SharedExternal, WrongOwner];
@Component({imports: [ContextCard], template: '<context-card></context-card>'})
export class RootConsumer {}
`;
  try {
    for (const [file, source] of Object.entries(files)) await writeFile(path.join(workspace, file), source);
    try {
      await run(workspace, files);
    } finally {
      // Check read-only behavior even when a RED assertion fails.
      for (const [file, source] of Object.entries(files)) assert.equal(await readFile(path.join(workspace, file), 'utf8'), source);
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

function manifest(kind, candidates) {
  return { target: { file: 'target.ts', symbol: 'ContextCard' }, projects: [{ name: kind,
    tsconfig: `tsconfig.${kind}.json`, anchor: { file: `${kind}.ts` },
    probes: [{ file: `${kind}.ts`, text: 'ContextCard' }], candidates }] };
}

function assertCleanup(report) {
  for (const row of report.coverage) {
    assert.equal(row.process.exited, true);
    assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
  }
}

for (const kind of ['spec', 'story']) {
  test(`explicit compiler candidates retain the ${kind} context of transitively imported template owners`, { timeout: 60000 }, async () => {
    await fixture(async (workspace, files) => {
      const report = await collect(workspace, manifest(kind, [
        { file: 'shared.ts', text: opening, offset: 1, backend: 'angular-compiler' },
        { file: 'shared.html', owner: 'shared.ts', text: opening, offset: 1, backend: 'angular-compiler' },
      ]));
      assertCleanup(report);
      assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.gaps));
      assert.equal(report.coverage[0].queryConfigEvidence.queryFile, `${kind}.ts`);
      assert.equal(report.candidateEvidence.length, 2);
      for (const candidate of report.candidateEvidence) {
        assert.equal(candidate.status, 'confirmed', candidate.error);
        assert.equal(candidate.tsconfig, `tsconfig.${kind}.json`);
        assert.equal(candidate.queryConfigEvidence.configFile, path.join(workspace, `tsconfig.${kind}.json`));
        assert.equal(candidate.definitionBackend, 'angular-compiler');
        assert.equal(candidate.fileHash, hash(files[candidate.file]));
        assert.equal(candidate.compilerEvidence.owner, path.join(workspace, 'shared.ts'));
        assert.equal(candidate.compilerEvidence.resolvesToTarget, true);
        const exact = candidate.compilerEvidence.directives.find(d => d.ref.filePath === path.join(workspace, 'target.ts') &&
          d.ref.position === files['target.ts'].indexOf('class ContextCard') + 'class '.length);
        assert.ok(exact, 'Evidence must identify the exact class identifier');
        assert.equal(exact.matchSource, 0);
        const native = candidate.compilerEvidence.sourceSpan;
        assert.equal(native.start.offset, files[candidate.file].indexOf(opening));
        assert.equal(native.end.offset, native.start.offset + opening.length);
        assert.equal(candidate.presentInReferences, false, 'Compiler recovery must retain the generic reference omission');
      }
      assert.ok(!report.references.some(ref => ref.file === 'shared.html'));
      for (const ref of report.references) {
        assert.ok(report.evidence.some(evidence => evidence.raw.some(raw =>
          raw.uri === new URL(ref.file, `file://${workspace}/`).href &&
          raw.range.start.line + 1 === ref.range.start.line && raw.range.start.character + 1 === ref.range.start.column &&
          raw.range.end.line + 1 === ref.range.end.line && raw.range.end.character + 1 === ref.range.end.column)),
        'Every reference must retain its actual raw backend span');
      }
      assert.ok(report.evidence.every(evidence => Array.isArray(evidence.raw)));
    });
  });
}

test('multiple enabled LSP projects cannot authorize a foreign compiler owner or a wrong external template owner', { timeout: 60000 }, async () => {
  await fixture(async (workspace) => {
    const report = await collect(workspace, manifest('spec', [
      // Opening an app-only file enables its LSP program. A false owner claim
      // must not allow either backend to attach it to the spec program.
      { file: 'outside.ts', owner: 'spec.ts', text: opening, offset: 1 },
      { file: 'outside.ts', owner: 'outside.ts', text: opening, offset: 1, backend: 'angular-compiler' },
      { file: 'shared.html', owner: 'wrong.ts', text: opening, offset: 1, backend: 'angular-compiler' },
    ]));
    assertCleanup(report);
    assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.gaps));
    const enabled = report.coverage[0].messages.filter(m => m.method === 'window/logMessage')
      .map(m => m.params?.message).filter(message => message?.startsWith('Enabling language service for '));
    assert.ok(enabled.some(message => message.includes('/tsconfig.app.json')), 'Negative control must really enable the other LSP program');
    assert.ok(enabled.some(message => message.includes('/tsconfig.spec.json')));
    for (const candidate of report.candidateEvidence) {
      assert.equal(candidate.status, 'unresolved');
      assert.ok(candidate.error, 'Retain the ownership rejection');
      assert.equal(candidate.compilerEvidence?.resolvesToTarget, undefined, 'No target association may be manufactured from another program or owner');
    }
    assert.equal(report.gaps.filter(gap => gap.code === 'candidate-unresolved').length, 3);
    assert.ok(!report.references.some(ref => ['outside.ts', 'shared.html'].includes(ref.file)));
  });
});
