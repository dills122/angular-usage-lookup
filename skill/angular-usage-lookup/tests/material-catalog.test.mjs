import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, mkdtemp, rm, cp, symlink } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
let pending;
async function catalog() {
  pending ??= import('../scripts/material-catalog.mjs').then(m => m.generateMaterialCatalog(root));
  return pending;
}
const entity = (c, family, name) => c.entities[c.indexes.byExport[`@angular/material/${family}#${name}`][0]];
const edge = (c, from, kind, name) => c.relationships.find(r => r.from === from.id && r.kind === kind && c.entities[r.to].name === name);

test('Catalog covers every typed Material entrypoint, accounts for exclusions, and resolves its graph', async () => {
  const c = await catalog();
  const pkg = require('@angular/material/package.json');
  const typed = Object.entries(pkg.exports).filter(([,v]) => v.types).map(([k]) => '@angular/material' + (k === '.' ? '' : k.slice(1))).sort();
  assert.deepEqual(c.coverage.typedEntrypoints, typed);
  assert.equal(c.coverage.excludedPackageExports.length, Object.keys(pkg.exports).length - typed.length);
  assert.equal(c.coverage.status, 'complete-for-installed-typed-entrypoints');
  assert.equal(c.versions['@angular/material'], '21.2.14');
  assert.ok(c.coverage.excludedInternalExports.length > 0);
  for (const r of c.relationships) {
    assert.ok(c.entities[r.from] && c.entities[r.to], JSON.stringify(r));
    assert.ok(c.sources[r.evidence.file]?.sha256);
  }
  for (const e of Object.values(c.entities)) assert.ok(c.sources[e.source.file]?.sha256);
  for (const [key, ids] of Object.entries(c.indexes.bySelector)) {
    assert.ok(ids.length > 0, key);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(c.entities[id].angular.selectors.some(s => s.text === key));
  }
  assert.ok(c.families.timepicker && c.families['form-field']);
  assert.deepEqual(c.indexes.bySelector['mat-grid-tile-footer'].map(id => c.entities[id].name).sort(), ['MatGridTileFooterCssMatStyler', 'MatGridTileText']);
  assert.ok(!JSON.stringify(c).includes(root), 'Portable output must not embed workspace paths');
  assert.ok(entity(c, 'button/testing', 'MatButtonHarness').exports.some(e => e.role === 'testing'));
  assert.ok(c.families.button.entrypoints.includes('@angular/material/button/testing'));
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  await writeFile(path.join(root, 'test-output/material-21.2.14.json'), JSON.stringify(c, null, 2) + '\n');
});

test('Missing entrypoints and unreadable Ivy metadata fail instead of yielding a complete catalog', async () => {
  const { generateMaterialCatalog } = await import('../scripts/material-catalog.mjs');
  const temp = await mkdtemp(path.join(tmpdir(), 'material-damaged-'));
  try {
    await writeFile(path.join(temp, 'package.json'), '{}');
    const angularRoot = path.join(temp, 'node_modules/@angular');
    await mkdir(angularRoot, { recursive: true });
    const profile = JSON.parse(await readFile(new URL('../references/material-profile.json', import.meta.url), 'utf8'));
    const pkg = require('@angular/material/package.json');
    const dependencies = new Set([...Object.keys(profile.versions).filter(n => n !== '@angular/material'), ...Object.keys(pkg.peerDependencies), 'tslib']);
    for (const name of dependencies) {
      await symlink(path.dirname(require.resolve(`${name}/package.json`)), path.join(temp, 'node_modules', name), 'dir');
    }
    const materialRoot = path.join(angularRoot, 'material');
    await mkdir(materialRoot);
    const installed = path.dirname(require.resolve('@angular/material/package.json'));
    await cp(path.join(installed, 'types'), path.join(materialRoot, 'types'), { recursive: true });
    const packageText = await readFile(path.join(installed, 'package.json'), 'utf8');
    await writeFile(path.join(materialRoot, 'package.json'), packageText);
    assert.deepEqual(await generateMaterialCatalog(temp), await catalog(), 'Unmodified relocated package has identical evidence');
    await writeFile(path.join(materialRoot, 'package.json'), JSON.stringify({ ...pkg,
      exports: { ...pkg.exports, './missing-test': { types: './types/missing-test.d.ts' } } }));
    await assert.rejects(generateMaterialCatalog(temp), /missing-test\.d\.ts.*not found/);
    await writeFile(path.join(materialRoot, 'package.json'), packageText);
    const buttonFile = path.join(materialRoot, 'types/button.d.ts');
    const source = await readFile(buttonFile, 'utf8');
    // Replace the first component metadata member only; keep valid TypeScript syntax.
    const lines = source.split('\n');
    const index = lines.findIndex(line => line.includes('static ɵcmp:'));
    assert.ok(index >= 0);
    lines[index] = '    static ɵcmp: never;';
    await writeFile(buttonFile, lines.join('\n'));
    await assert.rejects(generateMaterialCatalog(temp), /Unreadable Angular metadata: .*#MatButton/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('Button metadata preserves constructor typing, all selector alternatives, and inherited binding ownership', async () => {
  const c = await catalog();
  const button = entity(c, 'button', 'MatButton');
  assert.equal(button.kind, 'component');
  assert.deepEqual(button.angular.selectors.map(s => s.text), [
    'button[matButton]', 'a[matButton]', 'button[mat-button]', 'button[mat-raised-button]',
    'button[mat-flat-button]', 'button[mat-stroked-button]', 'a[mat-button]', 'a[mat-raised-button]',
    'a[mat-flat-button]', 'a[mat-stroked-button]',
  ]);
  assert.deepEqual(button.angular.exportAs, ['matButton', 'matAnchor']);
  assert.equal(button.angular.inputs.find(i => i.bindingPropertyName === 'matButton').classPropertyName, 'appearance');
  const base = c.entities[edge(c, button, 'extends', 'MatButtonBase').to];
  assert.equal(base.angular.inputs.find(i => i.bindingPropertyName === 'aria-disabled').classPropertyName, 'ariaDisabled');
  assert.ok(!button.angular.inputs.some(i => i.bindingPropertyName === 'aria-disabled'), 'Declared inputs must not be presented as flattened bindings');
  assert.ok(c.indexes.byDeclaredInput['aria-disabled'].includes(base.id));
  assert.ok(c.indexes.byExportAs.matButton.length > 1, 'Export names are one-to-many');
  assert.ok(edge(c, entity(c, 'button', 'MatAnchor'), 'constructor-type', 'MatButton'));
  assert.ok(edge(c, entity(c, 'button', 'MatButtonModule'), 'ngmodule-export', 'MatButton'));
});

test('Dialog selectors, host directives, table structural APIs and shared option identity survive extraction', async () => {
  const c = await catalog();
  const title = entity(c, 'dialog', 'MatDialogTitle');
  assert.deepEqual(title.angular.selectors.map(s => s.text), ['[mat-dialog-title]', '[matDialogTitle]']);
  const content = entity(c, 'dialog', 'MatDialogContent');
  assert.deepEqual(content.angular.selectors.map(s => s.text), ['[mat-dialog-content]', 'mat-dialog-content', '[matDialogContent]']);
  assert.deepEqual(edge(c, content, 'host-directive', 'CdkScrollable').inputs, {});
  assert.ok(c.indexes.byTag['mat-dialog-content'].includes(content.id));
  assert.ok(c.indexes.byAttribute.matDialogContent.includes(content.id));
  const row = entity(c, 'table', 'MatRowDef');
  assert.equal(row.angular.inputs.find(i => i.bindingPropertyName === 'matRowDefColumns').classPropertyName, 'columns');
  assert.ok(edge(c, row, 'extends', 'CdkRowDef'));
  const option = entity(c, 'core', 'MatOption');
  assert.equal(entity(c, 'select', 'MatOption').id, option.id);
  assert.equal(entity(c, 'autocomplete', 'MatOption').id, option.id);
  assert.ok(c.families.select.relatedFamilies.includes('core'));
  assert.ok(edge(c, entity(c, 'input', 'MatInput'), 'implements', 'MatFormFieldControl'));
});

test('Reviewed openers retain method overload evidence and distinguish template arguments', async () => {
  const c = await catalog();
  assert.deepEqual(c.programmaticRules.map(r => r.id), ['bottom-sheet.open', 'dialog.open', 'snack-bar.openFromComponent']);
  const dialog = c.programmaticRules.find(r => r.id === 'dialog.open');
  assert.equal(c.entities[dialog.receiver].name, 'MatDialog');
  assert.equal(dialog.argumentIndex, 0);
  assert.equal(dialog.templateOverload, true);
  assert.ok(dialog.signatures.some(s => s.parameterTypes[0].includes('ComponentType')));
  assert.ok(dialog.signatures.some(s => s.parameterTypes[0].includes('TemplateRef')));
  assert.ok(c.programmaticRules.find(r => r.id === 'snack-bar.openFromComponent').templateOverload === false);
  assert.ok(c.families.dialog.programmaticRules.includes(dialog.id));
});

test('Generation is reproducible and refuses an unqualified package version', async () => {
  const { generateMaterialCatalog } = await import('../scripts/material-catalog.mjs');
  assert.deepEqual(await generateMaterialCatalog(root), await catalog());
  const temp = await mkdtemp(path.join(tmpdir(), 'material-profile-'));
  try {
    await writeFile(path.join(temp, 'package.json'), '{}');
    const packageRoot = path.join(temp, 'node_modules/@angular/material');
    await mkdir(packageRoot, { recursive: true });
    await writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ name: '@angular/material', version: '22.0.0' }));
    await assert.rejects(generateMaterialCatalog(temp), /Unqualified @angular\/material version 22\.0\.0/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
