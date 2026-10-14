import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collect } from '../scripts/collect-references.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const point = (source, offset) => {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
};

// Generic directives use shared type constructors in Angular's TCB. References
// to the class inside that constructor have no template source mapping. Keep
// the backend omission reproducible and test independent definition evidence.
test('generic component and directive omissions can be reconciled with exact Angular definitions', { timeout: 60000 }, async () => {
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'test-output/generic-definition-'));
  const files = {
    'package.json': '{}',
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
      experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true },
    angularCompilerOptions: { strictTemplates: true }, files: ['target.ts', 'consumer.ts', 'shadow.ts'] }),
    'target.ts': `import { Component, Directive, Input } from '@angular/core';
@Component({selector: 'generic-target', template: ''})
export class GenericTarget<T = any> { @Input() value!: T; }
@Directive({selector: '[genericTarget]'})
export class GenericDirective<T = any> { @Input() value!: T; }
`,
    'consumer.ts': `import { Component } from '@angular/core';
import { GenericTarget, GenericDirective } from './target';
// <generic-target></generic-target> <div genericTarget></div>
const collateral = '<generic-target></generic-target> <div genericTarget></div>';
@Component({selector: 'inline-consumer', imports: [GenericTarget, GenericDirective], template: \`
<generic-target></generic-target><div genericTarget></div>
@if (visible) { <generic-target></generic-target><div genericTarget></div> }
@for (entry of entries; track entry) { <generic-target></generic-target><div genericTarget></div> }
@defer { <generic-target></generic-target><div genericTarget></div> }
\`})
export class InlineConsumer { visible = true; entries = [1]; }
@Component({selector: 'external-consumer', imports: [GenericTarget, GenericDirective], templateUrl: './different-name.html'})
export class ExternalConsumer {}
`,
    'different-name.html': '<generic-target></generic-target><div genericTarget></div>',
    'shadow.ts': `import { Component, Directive } from '@angular/core';
@Component({selector: 'generic-target', template: ''}) export class ShadowComponent {}
@Directive({selector: '[genericTarget]'}) export class ShadowDirective {}
@Component({selector: 'shadow-consumer', imports: [ShadowComponent, ShadowDirective], template: '<generic-target></generic-target><div genericTarget></div>'})
export class ShadowConsumer {}
`,
  };
  try {
    for (const [file, source] of Object.entries(files)) await writeFile(path.join(workspace, file), source);
    for (const [symbol, token] of [['GenericTarget', 'generic-target'], ['GenericDirective', 'genericTarget']]) {
      const candidates = [];
      for (const file of ['consumer.ts', 'different-name.html', 'shadow.ts']) {
        const source = files[file];
        // Fixture-authored candidates, not a production selector inference.
        const start = file === 'consumer.ts' ? source.indexOf('template: `') : file === 'shadow.ts' ? source.lastIndexOf('template:') : 0;
        for (const match of source.slice(start).matchAll(new RegExp(token, 'g'))) {
          const offset = start + match.index;
          if (source[offset - 1] === '/') continue;
          candidates.push({ file, text: token, occurrence: [...source.slice(0, offset).matchAll(new RegExp(token, 'g'))].length,
            offset: 1, ...(file.endsWith('.html') ? { owner: 'consumer.ts' } : {}) });
        }
      }
      candidates.push(...[0, 1].map(occurrence => ({ file: 'consumer.ts', text: token, occurrence: token === 'generic-target' ? occurrence * 2 : occurrence, offset: 1 })));
      const report = await collect(workspace, { target: { file: 'target.ts', symbol }, projects: [{ name: 'generic',
        tsconfig: 'tsconfig.json', anchor: { file: 'consumer.ts' }, probes: [{ file: 'consumer.ts', text: symbol }], candidates }] });
      assert.equal(report.collectionStatus, 'succeeded');
      const targetStart = point(files['target.ts'], files['target.ts'].indexOf(`class ${symbol}`) + 6);
      const recovered = report.candidateEvidence.filter(row => row.status === 'confirmed');
      for (const row of recovered) {
        assert.equal(row.resolvesToTarget, true);
        assert.equal(row.presentInReferences, false, 'Verified candidate evidence must expose the raw reference omission');
        assert.ok(row.definitions.length > 0);
        assert.equal(row.fileHash, createHash('sha256').update(files[row.file]).digest('hex'));
        for (const definition of row.definitions) {
          assert.equal(fileURLToPath(definition.targetUri), path.join(workspace, 'target.ts'));
          assert.deepEqual(definition.targetSelectionRange.start, targetStart);
          assert.ok(definition.originSelectionRange, 'Preserve official source span evidence');
        }
      }
      const shadow = report.candidateEvidence.filter(row => row.file === 'shadow.ts');
      assert.equal(shadow.length, 1);
      assert.equal(shadow[0].status, 'rejected', 'Same selector is not the same declaration');
      assert.equal(recovered.length, 5, 'Four inline/control-flow uses and one unrelated-name external template');
      assert.equal(report.candidateEvidence.length, 8);
      assert.ok(report.candidateEvidence.slice(-2).every(row => row.status !== 'confirmed'), 'Comments and ordinary strings cannot confirm template usage');
      assert.ok(report.candidateEvidence.slice(-2).every(row => row.status === 'unresolved'));
      // This assertion records the pinned Angular 21 upstream omission rather
      // than silently treating reference responses as complete. A future fixed
      // backend should cause this fixture to be deliberately requalified.
      assert.equal(report.references.filter(ref => ref.file === 'different-name.html').length, 0);
      assert.ok(report.evidence.length > 0 && report.evidence.every(item => Object.hasOwn(item, 'raw')));
      assert.ok(!report.references.some(ref => ref.file === 'shadow.ts'));
      assert.ok(!report.references.some(ref => ref.file === 'consumer.ts' && [3, 4].includes(ref.range.start.line)));
      for (const row of report.coverage) assert.equal(row.process.exited, true);
    }
    for (const [file, source] of Object.entries(files)) assert.equal(await readFile(path.join(workspace, file), 'utf8'), source);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('generic selector input accepts its direct member but preserves foreign-member ambiguity and invalid ownership', { timeout: 60000 }, async () => {
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'test-output/generic-selector-input-'));
  const files = {
    'package.json': '{}',
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
      experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true },
    angularCompilerOptions: { strictTemplates: true }, files: ['target.ts', 'consumer.ts'] }),
    'target.ts': `import { Directive, Input } from '@angular/core';
@Directive({selector: '[genericInput]'})
export class GenericInput<T = any> { @Input() genericInput!: T; }
@Directive({selector: '[foreignInput]'})
export class ForeignInput { @Input('genericInput') other!: string; }
`,
    'consumer.ts': `import { Component } from '@angular/core';
import { GenericInput, ForeignInput } from './target';
@Component({selector: 'good-consumer', imports: [GenericInput], templateUrl: './good.html'})
export class GoodConsumer { name = 'example'; }
@Component({selector: 'mixed-consumer', imports: [GenericInput, ForeignInput], templateUrl: './mixed.html'})
export class MixedConsumer { name = 'example'; }
`,
    'good.html': '<div [genericInput]="name"></div>\n<!-- no-definition -->',
    'mixed.html': '<div foreignInput [genericInput]="name"></div>',
  };
  try {
    for (const [file, source] of Object.entries(files)) await writeFile(path.join(workspace, file), source);
    const candidates = [
      { file: 'good.html', owner: 'consumer.ts', text: 'genericInput', offset: 1 },
      { file: 'mixed.html', owner: 'consumer.ts', text: 'genericInput', offset: 1 },
      { file: 'good.html', owner: 'not-in-config.ts', text: 'genericInput', offset: 1 },
      { file: 'good.html', owner: 'consumer.ts', text: 'no-definition', offset: 1 },
    ];
    const report = await collect(workspace, { target: { file: 'target.ts', symbol: 'GenericInput' }, projects: [{ name: 'generic-input',
      tsconfig: 'tsconfig.json', anchor: { file: 'consumer.ts' }, probes: [{ file: 'consumer.ts', text: 'GenericInput' }], candidates }] });
    assert.equal(report.collectionStatus, 'succeeded');
    assert.equal(report.status, 'partial');
    const [good, mixed, foreignOwner, absent] = report.candidateEvidence;
    // Check conservative failures before the positive assertion, so the RED
    // result isolates direct-member support rather than accepting foreign APIs.
    assert.equal(mixed.status, 'unresolved');
    assert.ok(mixed.definitions.length >= 3, 'Retain target class, own input and foreign input evidence');
    assert.equal(foreignOwner.status, 'unresolved');
    assert.match(foreignOwner.error, /owner.*root file/i);
    assert.equal(absent.status, 'unresolved');
    assert.ok(absent.definitions == null || absent.definitions.length === 0);
    assert.ok(report.gaps.filter(gap => gap.code === 'candidate-unresolved').length >= 3);
    assert.equal(good.definitions.length, 2, 'Official response includes exact class and its explicitly declared input');
    assert.equal(good.status, 'confirmed');
    assert.equal(good.definitionIdentity, 'target-and-declared-members');
    assert.equal(good.fileHash, createHash('sha256').update(files['good.html']).digest('hex'));
    assert.equal(good.presentInReferences, false);
    assert.ok(!report.references.some(ref => ['good.html', 'mixed.html'].includes(ref.file)));
    assert.ok(good.definitions.every(definition => definition.originSelectionRange));
    for (const [file, source] of Object.entries(files)) assert.equal(await readFile(path.join(workspace, file), 'utf8'), source);
    for (const row of report.coverage) assert.equal(row.process.exited, true);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('explicit Angular compiler candidates prove static Material tree directive associations while preserving LSP gaps', { timeout: 120000 }, async () => {
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'test-output/material-tree-compiler-'));
  const treeTargets = [
    ['MatTreeNode', '<mat-tree-node></mat-tree-node>', 'mat-tree-node'],
    ['MatNestedTreeNode', '<mat-nested-tree-node></mat-nested-tree-node>', 'mat-nested-tree-node'],
    ['MatTreeNodePadding', '<div matTreeNodePadding></div>', 'matTreeNodePadding'],
  ];
  const template = treeTargets.map(([, html]) => html).join('\n');
  const imports = treeTargets.map(([symbol]) => symbol).join(', ');
  const files = {
    'package.json': '{}',
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
      experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true },
    angularCompilerOptions: { strictTemplates: true }, files: ['consumer.ts'] }),
    'consumer.ts': `import { Component } from '@angular/core';
import { ${imports} } from '@angular/material/tree';
@Component({selector: 'tree-inline', imports: [${imports}], template: \`
${template}
@if (visible) { ${template} }
@for (entry of entries; track entry) { ${template} }
@defer { ${template} }
\`})
export class InlineConsumer { visible = true; entries = [1]; }
@Component({selector: 'tree-external', imports: [${imports}], templateUrl: './tree.html'})
export class ExternalConsumer {}
`,
    'tree.html': template,
  };
  try {
    for (const [file, source] of Object.entries(files)) await writeFile(path.join(workspace, file), source);
    const materialRoot = path.dirname(require.resolve('@angular/material/package.json'));
    const materialPackage = require('@angular/material/package.json');
    const targetFile = path.resolve(materialRoot, materialPackage.exports['./tree'].types);
    const ts = require('typescript');
    const targetSource = ts.createSourceFile(targetFile, await readFile(targetFile, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const [symbol, html, token] of treeTargets) {
      const targetClass = targetSource.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === symbol);
      assert.ok(targetClass, 'Independent package declaration oracle must resolve');
      const anchors = [];
      for (const file of ['consumer.ts', 'tree.html']) {
        const count = files[file].split(html).length - 1;
        for (let occurrence = 0; occurrence < count; occurrence++) anchors.push({ file, text: html, offset: html.indexOf(token) + 1,
          occurrence, ...(file.endsWith('.html') ? { owner: 'consumer.ts' } : {}) });
      }
      assert.equal(anchors.length, 5);
      const report = await collect(workspace, { target: { file: path.relative(workspace, targetFile), symbol }, projects: [{ name: symbol,
        tsconfig: 'tsconfig.json', anchor: { file: 'consumer.ts' }, probes: [{ file: 'consumer.ts', text: symbol }],
        candidates: [...anchors, ...anchors.map(anchor => ({ ...anchor, backend: 'angular-compiler' }))] }] });
      assert.equal(report.collectionStatus, 'succeeded');
      assert.equal(report.status, 'partial');
      assert.equal(report.candidateEvidence.length, 10);
      const languageService = report.candidateEvidence.slice(0, 5);
      assert.ok(languageService.every(candidate => candidate.status === 'unresolved'), 'Retain actual null/mixed LSP evidence separately');
      for (const candidate of languageService) {
        if (symbol === 'MatTreeNodePadding') assert.equal(candidate.definitions, null);
        else assert.ok(candidate.definitions.length >= 3, 'Exact class plus native DOM co-definitions remain explicit');
      }
      const compiler = report.candidateEvidence.slice(5);
      for (const candidate of compiler) {
        assert.equal(candidate.status, 'confirmed', `${symbol}: static template directive must be confirmed by Angular compiler`);
        assert.equal(candidate.definitionBackend, 'angular-compiler');
        assert.equal(candidate.fileHash, createHash('sha256').update(files[candidate.file]).digest('hex'));
        const directive = candidate.compilerEvidence.directives.find(d => d.ref.filePath === targetFile && d.ref.position === targetClass.name.getStart(targetSource));
        assert.ok(directive, 'Official compiler evidence must identify the exact declaration, not its spelling alone');
        assert.equal(directive.matchSource, 0, 'Direct selector matching must not be confused with host directive relationships');
      }
      assert.ok(!report.references.some(ref => ref.file === 'tree.html'), 'Compiler evidence must not rewrite raw reference omissions');
      for (const row of report.coverage) assert.equal(row.process.exited, true);
      for (const [file, source] of Object.entries(files)) assert.equal(await readFile(path.join(workspace, file), 'utf8'), source);
    }
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});

test('compiler candidates reject foreign selectors, indirect host directives and non-template or member anchors', { timeout: 60000 }, async () => {
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'test-output/compiler-candidate-negatives-'));
  const files = {
    'package.json': '{}',
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
      experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true },
    angularCompilerOptions: { strictTemplates: true }, files: ['target.ts', 'consumer.ts'] }),
    'target.ts': `import { Directive, Input } from '@angular/core';
@Directive({selector: '[lookupTarget]'})
export class LookupTarget<T = any> { @Input() value!: T; }
@Directive({selector: '[lookupTarget]'})
export class ForeignTarget {}
@Directive({selector: '[hostCarrier]', hostDirectives: [LookupTarget]})
export class HostCarrier {}
`,
    'consumer.ts': `import { Component } from '@angular/core';
import { LookupTarget, ForeignTarget, HostCarrier } from './target';
// <div lookupTarget></div>
const ordinaryString = '<div lookupTarget></div>';
@Component({selector: 'direct-use', imports: [LookupTarget], template: '<div lookupTarget [value]="name"></div>'})
export class DirectUse { name = 'example'; }
@Component({selector: 'foreign-use', imports: [ForeignTarget], template: '<div lookupTarget></div>'})
export class ForeignUse {}
@Component({selector: 'host-use', imports: [HostCarrier], template: '<div hostCarrier></div>'})
export class HostUse {}
`,
  };
  try {
    for (const [file, source] of Object.entries(files)) await writeFile(path.join(workspace, file), source);
    const common = { file: 'consumer.ts', backend: 'angular-compiler' };
    const candidates = [
      { ...common, text: '<div lookupTarget [value]', offset: 6 },
      { ...common, text: '<div lookupTarget></div>', occurrence: 2, offset: 6 },
      { ...common, text: '<div hostCarrier>', offset: 6 },
      { ...common, text: '<div lookupTarget></div>', occurrence: 0, offset: 6 },
      { ...common, text: '<div lookupTarget></div>', occurrence: 1, offset: 6 },
    ];
    const manifest = { target: { file: 'target.ts', symbol: 'LookupTarget' }, projects: [{ name: 'negative-controls',
      tsconfig: 'tsconfig.json', anchor: { file: 'consumer.ts' }, probes: [{ file: 'consumer.ts', text: 'LookupTarget' }], candidates }] };
    const report = await collect(workspace, manifest);
    assert.equal(report.collectionStatus, 'succeeded');
    assert.equal(report.status, 'partial');
    const [direct, foreign, host, comment, ordinaryString] = report.candidateEvidence;
    assert.equal(direct.status, 'confirmed', 'Control proves the target is in scope where explicitly imported');
    const targetReference = direct.compilerEvidence.directives.find(d => d.ref.name === 'LookupTarget').ref;
    assert.equal(foreign.status, 'rejected', 'An identical selector cannot substitute a foreign declaration');
    assert.ok(foreign.compilerEvidence.directives.some(d => d.ref.name === 'ForeignTarget'));
    assert.ok(!foreign.compilerEvidence.directives.some(d => d.ref.filePath === targetReference.filePath && d.ref.position === targetReference.position));
    assert.equal(host.status, 'rejected', 'Indirect host-directive relationships must not count as direct selector uses');
    const indirect = host.compilerEvidence.directives.find(d => d.ref.filePath === targetReference.filePath && d.ref.position === targetReference.position);
    assert.ok(indirect, 'Preserve the genuine indirect relationship as native evidence');
    assert.equal(indirect.matchSource, 1);
    for (const candidate of [comment, ordinaryString]) {
      assert.equal(candidate.status, 'unresolved');
      assert.ok(candidate.error, 'Preserve backend rejection or upstream definition errors for non-template anchors');
      assert.equal(candidate.compilerEvidence, undefined, 'Never manufacture directive associations from text collateral');
    }
    for (const candidate of report.candidateEvidence) assert.equal(candidate.fileHash, createHash('sha256').update(files[candidate.file]).digest('hex'));
    const memberManifest = structuredClone(manifest);
    memberManifest.target.member = 'value';
    memberManifest.projects[0].probes = [{ file: 'target.ts', text: 'value' }];
    memberManifest.projects[0].candidates = [{ ...common, text: '[value]', offset: 2 }];
    const memberReport = await collect(workspace, memberManifest);
    assert.equal(memberReport.collectionStatus, 'succeeded');
    assert.equal(memberReport.candidateEvidence[0].status, 'unresolved');
    assert.match(memberReport.candidateEvidence[0].error, /class associations only/);
    assert.equal(memberReport.candidateEvidence[0].compilerEvidence, undefined);
    for (const result of [report, memberReport]) for (const row of result.coverage) {
      assert.equal(row.process.exited, true);
      assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
    }
    for (const [file, source] of Object.entries(files)) assert.equal(await readFile(path.join(workspace, file), 'utf8'), source);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
