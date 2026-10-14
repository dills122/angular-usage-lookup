import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { startTypeScript } from '../../scripts/typescript.mjs';
import { collect } from '../../scripts/collect-references.mjs';
import { parseTemplate } from '@angular/compiler';

const require = createRequire(import.meta.url), ts = require('typescript');
const key = r => `${r.file}:${JSON.stringify(r.range)}`;
export const aliasIds = ['lazy-destructure-alias', 'lazy-destructure-return', 'code-alias', 'code-dialog', 'code-create', 'default-alias', 'default-dialog'];
function normalized(workspace, location) {
  return { file: path.relative(workspace, fileURLToPath(location.uri)), range: {
    start: { line: location.range.start.line + 1, column: location.range.start.character + 1 },
    end: { line: location.range.end.line + 1, column: location.range.end.character + 1 },
  } };
}
function at(file, source, text, offset = 0, occurrence = 0) {
  let index = -1;
  for (let i = 0; i <= occurrence; i++) index = source.indexOf(text, index + 1);
  assert.ok(index >= 0, `Authored query exists: ${file} ${text}`);
  const lines = source.slice(0, index + offset).split('\n');
  return { textDocument: { uri: pathToFileURL(file).href }, position: { line: lines.length - 1, character: lines.at(-1).length } };
}

export async function investigateAliases(workspace, output, expected) {
  const parsed = ts.getParsedCommandLineOfConfigFile(path.join(workspace, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: d => { throw new Error(String(d.messageText)); } });
  const service = startTypeScript(ts, workspace, parsed), references = [], evidence = [];
  const target = expected.find(e => e.target === 'dynamic' && e.id === 'declaration');
  try {
    for (const [file, local, property, module] of [
      ['src/routes.ts', 'LazyCard', 'DynamicCard', './barrel'],
      ['src/lazy-code.ts', 'LazyDialog', 'DynamicCard', './barrel'],
      ['src/lazy-code.ts', 'LazyDefault', 'default', './default-card'],
    ]) {
      const absolute = path.join(workspace, file), source = await readFile(absolute, 'utf8');
      const ast = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true);
      let binding;
      function visit(node) { if (ts.isBindingElement(node) && node.name.getText(ast) === local) binding = node; ts.forEachChild(node, visit); }
      visit(ast);
      assert.ok(binding && ts.isObjectBindingPattern(binding.parent));
      assert.equal(binding.propertyName.getText(ast), property);
      const initializer = binding.parent.parent.initializer;
      assert.ok(ts.isAwaitExpression(initializer) && ts.isCallExpression(initializer.expression));
      assert.equal(initializer.expression.expression.kind, ts.SyntaxKind.ImportKeyword);
      assert.equal(initializer.expression.arguments[0].text, module);
      // Verify the imported PROPERTY against the class. The local binding is a
      // different TS symbol; querying it as if it were that class must fail.
      const propertyPosition = ast.getLineAndCharacterOfPosition(binding.propertyName.getStart(ast));
      const propertyQuery = { textDocument: { uri: pathToFileURL(absolute).href }, position: { line: propertyPosition.line, character: propertyPosition.character } };
      const identity = service.definition(propertyQuery);
      assert.ok(identity.locations.length > 0);
      assert.ok(identity.locations.map(l => normalized(workspace, l)).every(l => key(l) === key(target)), `${local} source binding resolves to target`);
      const localPosition = ast.getLineAndCharacterOfPosition(binding.name.getStart(ast));
      const localQuery = { ...propertyQuery, position: { line: localPosition.line, character: localPosition.character } };
      const localIdentity = service.definition(localQuery);
      assert.ok(localIdentity.locations.some(l => key(normalized(workspace, l)) !== key(target)), 'Local alias must not be misrepresented as the same TS declaration');
      const result = service.references([localQuery]);
      references.push(...result.locations.map(l => ({ ...normalized(workspace, l), kind: 'source-linked-alias-reference', relation: local })));
      evidence.push({ local, property, module, identity, localIdentity, result });
    }
    const wanted = expected.filter(e => aliasIds.includes(e.id));
    assert.deepEqual(references.map(key).sort(), wanted.map(key).sort(), 'Every missing alias binding/use is recovered without inventing class identity');
    await writeFile(path.join(output, 'alias-followups.json'), JSON.stringify({ references, evidence }, null, 2));
    return references;
  } finally { service.dispose(); }
}

export async function investigateFlows(workspace, output) {
  const parsed = ts.getParsedCommandLineOfConfigFile(path.join(workspace, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: d => { throw new Error(String(d.messageText)); } });
  const service = startTypeScript(ts, workspace, parsed), results = [];
  // Independently authored local symbol occurrences, not a new data-flow engine.
  const checks = [
    { file: 'src/modern.ts', token: 'main', count: 3, role: 'registry declaration + selected property + dialog call' },
    { file: 'src/routes.ts', token: 'main', count: 2, role: 'registry declaration + eager route' },
    { file: 'src/modern.ts', token: 'openWrapped', count: 2, role: 'wrapper call + method declaration' },
    { file: 'src/modern.ts', token: 'factory', count: 2, role: 'resolved component factory + createComponent argument' },
    { file: 'src/modern.ts', token: 'portalFragment', count: 2, role: 'queried template property + TemplatePortal construction' },
    { file: 'src/modern.ts', token: 'dialogTemplate', count: 4, role: 'queried template property + dialog/sheet/snackbar calls' },
    { file: 'src/modern.ts', token: 'embedded', count: 3, role: 'queried template property + two embedded-view creation APIs' },
  ];
  try {
    for (const check of checks) {
      const absolute = path.join(workspace, check.file), source = await readFile(absolute, 'utf8');
      const ast = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true), matches = [];
      function visit(node) { if (ts.isIdentifier(node) && node.text === check.token) matches.push({ index: node.getStart(ast) }); ts.forEachChild(node, visit); }
      visit(ast);
      assert.equal(matches.length, check.count, `Authored exact tokens: ${check.role}`);
      const query = at(absolute, source, source.slice(matches[0].index), 0);
      const result = service.references([query]);
      const wanted = matches.map(m => {
        const p = at(absolute, source, source.slice(m.index), 0).position;
        return { file: check.file, range: { start: { line: p.line + 1, column: p.character + 1 }, end: { line: p.line + 1, column: p.character + check.token.length + 1 } } };
      });
      assert.deepEqual(result.locations.map(l => key(normalized(workspace, l))).sort(), wanted.map(key).sort(), check.role);
      results.push({ ...check, result });
    }
    // Registry-key references do not establish which runtime value will be used.
    const source = await readFile(path.join(workspace, 'src/modern.ts'), 'utf8');
    assert.ok(source.includes('this.dialog.open(REGISTRY[key])'));
    const gaps = [
      { id: 'runtime-registry', file: 'src/modern.ts', source: 'this.dialog.open(REGISTRY[key])', outcome: 'unresolved', reason: 'Caller-provided key may select DynamicCard or OtherCard; no confirmed target execution.' },
      { id: 'conditional-route', file: 'src/routes.ts', outcome: 'unresolved', reason: 'Both conditional component candidates are statically visible; random runtime choice is unknown.' },
    ];
    await writeFile(path.join(output, 'flow-followups.json'), JSON.stringify({ results, gaps }, null, 2));
    return { checks: results.length, references: checks.reduce((n, c) => n + c.count, 0), gaps };
  } finally { service.dispose(); }
}

export async function investigateMembers(workspace, output) {
  const checks = [
    { symbol: 'GauntletCard', file: 'src/cards.ts', member: 'label', probe: 'caption]', count: 3 },
    { symbol: 'GauntletCard', file: 'src/cards.ts', member: 'closed', probe: 'dismissed)', count: 2 },
    { symbol: 'GauntletCard', file: 'src/cards.ts', member: 'count', probe: 'count)]', count: 2 },
    { symbol: 'ModernPage', file: 'src/modern.ts', member: 'direct', probe: 'direct; inputs', count: 2 },
    { symbol: 'ModernPage', file: 'src/modern.ts', member: 'selected', probe: 'selected]', count: 2 },
    { symbol: 'ModernPage', file: 'src/modern.ts', member: 'templatePortal', probe: 'templatePortal]', count: 3 },
    { symbol: 'ModernPage', file: 'src/modern.ts', member: 'legacyType', probe: 'legacyType"', count: 2 },
  ];
  const results = [];
  const declarations = (member, file) => ({ file, text: `${member}${member === 'templatePortal' ? '?' : ' ='}`, token: member });
  const expectedTokens = {
    label: [declarations('label', 'src/cards.ts'), { file: 'src/modern.html', text: '[caption]', token: 'caption', offset: 1 }, { file: 'src/modern.html', text: '[caption]', token: 'caption', offset: 1, occurrence: 1 }],
    closed: [declarations('closed', 'src/cards.ts'), { file: 'src/modern.html', text: '(dismissed)', token: 'dismissed', offset: 1 }],
    count: [declarations('count', 'src/cards.ts'), { file: 'src/modern.html', text: '[(count)]', token: 'count', offset: 2 }],
    direct: [declarations('direct', 'src/modern.ts'), { file: 'src/modern.html', text: 'direct; inputs', token: 'direct' }],
    selected: [declarations('selected', 'src/modern.ts'), { file: 'src/modern.html', text: 'selected"', token: 'selected' }],
    templatePortal: [declarations('templatePortal', 'src/modern.ts'), { file: 'src/modern.ts', text: 'this.templatePortal =', token: 'templatePortal', offset: 5 }, { file: 'src/modern.html', text: 'templatePortal"', token: 'templatePortal' }],
    legacyType: [declarations('legacyType', 'src/modern.ts'), { file: 'src/modern.html', text: 'legacyType"', token: 'legacyType' }],
  };
  for (const check of checks) {
    // Bindings contain quotes before ], so explicit whole snippets below keep
    // the probe inside the expression, not inside an unrelated nearby token.
    const text = check.member === 'selected' ? 'selected"' : check.member === 'templatePortal' ? 'templatePortal"' : check.probe;
    const report = await collect(workspace, { target: { file: check.file, symbol: check.symbol, member: check.member }, projects: [{ name: 'gauntlet', tsconfig: 'tsconfig.json',
      anchor: { file: 'src/modern.ts' }, probes: [{ file: 'src/modern.html', owner: 'src/modern.ts', text }] }] });
    await writeFile(path.join(output, `member-${check.symbol}-${check.member}.json`), JSON.stringify(report, null, 2));
    assert.equal(report.status, 'partial');
    for (const row of report.coverage) if (row.process) {
      assert.equal(row.process.exited, true);
      assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
    }
    const wanted = [];
    for (const spec of expectedTokens[check.member]) {
      const p = at(path.join(workspace, spec.file), await readFile(path.join(workspace, spec.file), 'utf8'), spec.text, spec.offset, spec.occurrence).position;
      wanted.push({ file: spec.file, range: { start: { line: p.line + 1, column: p.character + 1 }, end: { line: p.line + 1, column: p.character + spec.token.length + 1 } } });
    }
    results.push({ ...check, status: report.collectionStatus, actual: report.references.length, exactLocations: JSON.stringify(report.references.map(key).sort()) === JSON.stringify(wanted.map(key).sort()), errors: report.coverage.filter(r => r.error).map(r => r.error) });
  }
  await writeFile(path.join(output, 'member-qualification.json'), JSON.stringify(results, null, 2));
  assert.ok(results.every(r => r.status === 'succeeded' && r.actual === r.count && r.exactLocations), JSON.stringify(results));
  return results;
}

export async function investigateNonBindable(workspace, output) {
  const source = await readFile(path.join(workspace, 'src/modern.html'), 'utf8');
  const parsed = parseTemplate(source, 'src/modern.html');
  assert.equal(parsed.errors, null);
  const hosts = parsed.nodes.filter(n => n.attributes?.some(a => a.name === 'ngNonBindable'));
  assert.equal(hosts.length, 2, 'Both an active component host and a disabled descendant case');
  const parent = hosts.find(n => n.name === 'div');
  const child = parent.children[0];
  assert.equal(child.name, 'gauntlet-card');
  assert.equal(child.attributes.find(a => a.name === 'data-case')?.value, 'non-bindable-negative');
  const componentHost = hosts.find(n => n.name === 'gauntlet-card');
  assert.equal(componentHost.attributes.find(a => a.name === 'data-case')?.value, 'non-bindable-host');
  const emitted = await readFile(path.join(output, 'compiled/modern.js'), 'utf8');
  const regions = [...emitted.matchAll(/ɵɵdisableBindings\(\);([\s\S]*?)ɵɵenableBindings\(\);/g)].map(m => m[1]);
  assert.ok(regions.some(r => /ɵɵelement\(\d+, "gauntlet-card"/.test(r)), 'Angular emits the child element with directive bindings disabled');
  const span = child.startSourceSpan;
  const rejected = { file: 'src/modern.html', range: { start: { line: span.start.line + 1, column: span.start.col + 1 }, end: { line: span.end.line + 1, column: span.end.col + 1 } },
    reason: 'Descendant of ngNonBindable; verified with Angular template AST and emitted disabled-binding instructions. Host remains eligible.' };
  await writeFile(path.join(output, 'non-bindable-investigation.json'), JSON.stringify({ rejected, emittedRegions: regions }, null, 2));
  return rejected;
}

export async function investigateOpeners(workspace, output) {
  const parsed = ts.getParsedCommandLineOfConfigFile(path.join(workspace, 'tsconfig.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: d => { throw new Error(String(d.messageText)); } });
  const program = ts.createProgram(parsed.fileNames, parsed.options), checker = program.getTypeChecker();
  const source = program.getSourceFile(path.join(workspace, 'src/modern.ts')), evidence = [];
  // Explicit call list: resolve the API's overload, including a misleading local
  // .open method. Names alone must not classify semantic refs as render calls.
  const expected = [
    ['this.dialog.open', 'dialog', 5], ['this.dialog[\'open\']', 'dialog', 1],
    ['this.sheet.open', 'bottom-sheet', 2], ['this.snack.openFromComponent', 'snack-bar', 1],
    ['this.snack.openFromTemplate', 'snack-bar', 1], ['fake.open', 'local', 1],
  ];
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const entry = expected.find(e => e[0] === node.expression.getText(source));
      if (entry) {
        const signature = checker.getResolvedSignature(node), declaration = signature?.declaration;
        assert.ok(declaration);
        const file = declaration.getSourceFile().fileName;
        if (entry[1] === 'local') assert.equal(file, source.fileName);
        else assert.ok(file.includes('/@angular/material/types/') && file.includes(entry[1]), file);
        evidence.push({ call: entry[0], family: entry[1], source: node.getText(source), declaration: file, declarationText: declaration.getText().slice(0, 400) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  for (const [call, , count] of expected) assert.equal(evidence.filter(e => e.call === call).length, count, call);
  await writeFile(path.join(output, 'opener-identities.json'), JSON.stringify(evidence, null, 2));
  return { checked: evidence.length, rejectedLookalikes: 1 };
}

export async function investigateSourceEdges(workspace, output) {
  // This is the recorded skill investigation for THIS fixture, not inferred
  // global dataflow. TypeScript/Angular queries above verify endpoint identity.
  const edges = [
    { id: 'default-lazy-route', from: ['src/routes.ts', "loadComponent: () => import('./default-card')"], to: ['src/default-card.ts', '/*@use:dynamic:default-export*/DynamicCard'], role: 'default export module -> component candidate' },
    { id: 'lazy-route-list', from: ['src/routes.ts', "loadChildren: () => import('./child.routes').then(m => m.childRoutes)"], to: ['src/child.routes.ts', '/*@use:dynamic:child-route*/DynamicCard'], role: 'lazy route list -> child component' },
    { id: 'lazy-ngmodule', from: ['src/routes.ts', "loadChildren: () => import('./legacy').then(m => m.LazyLegacyModule)"], to: ['src/legacy.ts', "RouterModule.forChild([{ path: '', component: LegacyPage }])"], role: 'lazy NgModule -> module route' },
    { id: 'lazy-module-template', from: ['src/legacy.ts', "templateUrl: './legacy.html'"], to: ['src/legacy.html', '<gauntlet-card data-case="star-if"'], role: 'routed module component -> external template dependency' },
    { id: 'outlet-fragment-one', from: ['src/modern.html', '*ngTemplateOutlet="fragment; context:'], to: ['src/modern.html', '<ng-template #fragment'], role: 'template outlet -> fragment declaration' },
    { id: 'outlet-fragment-two', from: ['src/modern.html', '[ngTemplateOutlet]="fragment"'], to: ['src/modern.html', '<ng-template #fragment'], role: 'second outlet -> same fragment, not a second source occurrence' },
    { id: 'recursive-fragment', from: ['src/modern.html', '*ngTemplateOutlet="recursive; context: {$implicit: node.children}'], to: ['src/modern.html', '<ng-template #recursive'], role: 'recursive outlet -> same fragment; runtime count unknown' },
    { id: 'template-query-dialog', from: ['src/modern.ts', "@ViewChild('dialogTemplate', { read: TemplateRef })"], to: ['src/modern.html', '<ng-template #dialogTemplate'], role: 'queried template -> content; three typed Material openers share it' },
    { id: 'template-query-portal', from: ['src/modern.ts', "@ViewChild('portalFragment', { read: TemplateRef })"], to: ['src/modern.html', '<ng-template #portalFragment'], role: 'TemplatePortal source -> fragment' },
    { id: 'template-query-embedded', from: ['src/modern.ts', "@ViewChild('embedded', { read: TemplateRef })"], to: ['src/modern.html', '<ng-template #embedded'], role: 'embedded view APIs -> fragment' },
    { id: 'component-outlet', from: ['src/modern.ts', '/*@use:dynamic:outlet-property*/DynamicCard'], to: ['src/modern.html', '*ngComponentOutlet="direct;'], role: 'component property -> component outlet' },
    { id: 'module-component-outlet', from: ['src/modern.ts', '/*@use:legacy:dynamic-module-property*/LegacyCard'], to: ['src/modern.html', '[ngComponentOutlet]="legacyType" [ngComponentOutletNgModule]="legacyModule"'], role: 'non-standalone component + declaring module -> component outlet' },
  ];
  const evidence = [];
  for (const edge of edges) {
    const endpoints = [];
    for (const [file, text] of [edge.from, edge.to]) {
      const source = await readFile(path.join(workspace, file), 'utf8');
      const request = at(path.join(workspace, file), source, text);
      assert.equal(source.split(text).length, 2, `${edge.id} uniquely anchored endpoint`);
      endpoints.push({ file, text, position: { line: request.position.line + 1, column: request.position.character + 1 } });
    }
    evidence.push({ id: edge.id, role: edge.role, endpoints, classification: 'source-reviewed-relationship', runtimeExecution: 'not-established' });
  }
  await writeFile(path.join(output, 'source-edges.json'), JSON.stringify(evidence, null, 2));
  return { checked: evidence.length, runtimeExecution: 'not-established' };
}
