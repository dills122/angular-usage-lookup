import { cp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const output = path.join(root, 'test-output/scale');
export const workspace = path.join(output, 'workspace');
const baseline = path.join(root, 'tests/fixtures/nx-stress');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const digest = data => createHash('sha256').update(data).digest('hex');
const feature = i => `feature${String(i).padStart(2, '0')}`;

// This is fixture construction, not a lookup implementation. The dependency
// blueprint and expected text spans are fixed BEFORE invoking either backend.
export async function generate() {
  // Only this fixed ignored fixture directory is regenerated.
  await rm(workspace, { recursive: true, force: true });
  await mkdir(workspace, { recursive: true });
  await cp(baseline, workspace, { recursive: true, filter: file => !file.split(path.sep).some(p => ['.nx', 'dist'].includes(p)) });
  const write = async (file, text) => { await mkdir(path.dirname(path.join(workspace, file)), { recursive: true }); await writeFile(path.join(workspace, file), text); };
  const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
  const card = await json(path.join(baseline, 'lookup-card.json'));
  const dialog = await json(path.join(baseline, 'lookup-dialog.json'));
  const expected = { card: (await json(path.join(baseline, 'expected-card.json'))).references,
    dialog: (await json(path.join(baseline, 'expected-dialog.json'))).references };
  const configByContext = Object.fromEntries(card.projects.map(p => [p.name, p.tsconfig]));
  const apps = ['storefront', 'admin', 'operations'];
  const appGroups = { storefront: [0, 1], admin: [1, 2], operations: [0, 2] };
  const laterContexts = i => {
    const group = Math.floor(i / 16);
    return [...Array.from({ length: (group + 1) * 16 - i }, (_, n) => feature(i + n)),
      ...apps.filter(app => appGroups[app].includes(group))];
  };
  // Known source closure of all new features is the original storefront's six
  // libraries (ModernPanel + ReportPanel + SharedModule), excluding its app and
  // the UI demo root which is never exported/imported.
  for (const refs of Object.values(expected)) for (const ref of refs) {
    if (!ref.file.startsWith('apps/') && ref.contexts.includes('storefront')) {
      ref.contexts.push(...Array.from({ length: 48 }, (_, i) => feature(i)), 'operations');
    }
    ref.category = ref.kind === 'template' ? 'baseline-mixed-template' : 'baseline-symbol';
  }
  const add = (target, file, text, contexts, category, occurrence = 0, wholeWord = false) =>
    expected[target].push({ file, text, contexts: [...contexts], category, occurrence, wholeWord });
  const base = await json(path.join(workspace, 'tsconfig.base.json'));
  async function project(name, type, configs) {
    const folder = `${type === 'application' ? 'apps' : 'libs'}/${name}`;
    await writeJson(`${folder}/project.json`, { name, projectType: type, sourceRoot: `${folder}/src`, targets: Object.fromEntries(configs.map(kind => [kind === 'lib' ? 'typecheck' : `typecheck-${kind}`, {
      executor: 'nx:run-commands', options: { command: `ngc -p ${folder}/tsconfig.${kind}.json --noEmit`, forwardAllArgs: false, tsConfig: `${folder}/tsconfig.${kind}.json` },
    }])) });
    await writeJson(`${folder}/tsconfig.json`, { extends: '../../tsconfig.base.json', files: [], references: configs.map(kind => ({ path: `./tsconfig.${kind}.json` })) });
    for (const kind of configs) await writeJson(`${folder}/tsconfig.${kind}.json`, {
      extends: '../../tsconfig.base.json', include: ['src/**/*.ts'], exclude: kind === 'lib' ? ['src/spec.ts', 'src/story.ts'] : [kind === 'spec' ? 'src/story.ts' : 'src/spec.ts'],
    });
    return folder;
  }
  const templates = [
    ['legacy-if', '<super-cool *ngIf="visible; else empty" [label]="rows[0]" /><ng-template #empty><super-cool label="empty" /></ng-template>'],
    ['legacy-for', '<super-cool *ngFor="let row of rows" [label]="row" />'],
    ['modern-control-flow', '@if (visible) { <super-cool label="if" /> } @for (row of rows; track row) { <super-cool [label]="row" /> }'],
    ['defer', '@defer { <super-cool label="deferred" /> } @placeholder { <span>waiting</span> }'],
    ['template-outlet', '<ng-template #content><super-cool label="outlet" /></ng-template><ng-container *ngTemplateOutlet="content" />'],
    ['legacy-switch', '<div [ngSwitch]="mode"><super-cool *ngSwitchCase="1" /><super-cool *ngSwitchDefault /></div>'],
    ['projection', '<super-cool label="projection"><span>child</span></super-cool>'],
    ['utf16-crlf', '😀 <super-cool label="unicode" />\r\n<super-cool label="second" />'],
  ];
  for (let i = 0; i < 48; i++) {
    const name = feature(i), contexts = laterContexts(i), folder = await project(name, 'library', ['lib']);
    base.compilerOptions.paths[`@scale/${name}`] = [`${folder}/src/index.ts`];
    const [category, template] = templates[i % templates.length];
    const standalone = i % 2 === 0;
    const imports = 'CommonModule, SharedModule, ModernPanel, ReportPanel';
    const previous = i % 16 ? `import {Feature${i - 1}Module} from '@scale/${feature(i - 1)}';\n` : '';
    const auxImports = Array.from({ length: 8 }, (_, j) => `import {Aux${j}} from './aux${j}';`).join('\n');
    const auxNames = Array.from({ length: 8 }, (_, j) => `Aux${j}`).join(',');
    const templateFile = `${folder}/src/screen.html`;
    const templateOption = standalone ? `template: ${JSON.stringify(template)}` : "templateUrl: './screen.html'";
    const source = `import {Component, NgModule, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedModule} from '@stress/shared';
import {ModernPanel} from '@stress/modern';
import {ReportPanel} from '@stress/reporting';
import {MatDialog} from '@angular/material/dialog';
import {CoolDialogComponent} from '@stress/dialogs';
${previous}${auxImports}
@Component({selector:'scale-${name}', standalone:${standalone}, ${standalone ? `imports:[${imports}],` : ''} ${templateOption}})
export class Feature${i} { visible=true; rows=['a','b']; mode=1; dialog=inject(MatDialog); open(){ return this.dialog.open(CoolDialogComponent); } }
@NgModule({${standalone ? '' : `declarations:[Feature${i}],`} imports:[${imports},${auxNames},${standalone ? `Feature${i},` : ''}${i % 16 ? `Feature${i - 1}Module` : ''}], exports:[Feature${i}]})
export class Feature${i}Module {}
`;
    // Use a literal template so exact Angular offsets also exercise CRLF/UTF-16.
    const content = standalone ? source.replace(JSON.stringify(template), '`' + template + '`') : source;
    await write(`${folder}/src/feature.ts`, content);
    if (!standalone) await write(templateFile, template);
    await write(`${folder}/src/index.ts`, `export {Feature${i}Module} from './feature';\n`);
    // Same spelling and selector in another valid scope must never be confirmed.
    await write(`${folder}/src/unrelated.ts`, `import {Component} from '@angular/core';\n@Component({selector:'super-cool',template:''}) export class SuperCoolComponent {}\n@Component({imports:[SuperCoolComponent],template:'<super-cool />'}) export class OtherHost {}\n`);
    for (const tag of template.matchAll(/<super-cool\b[^>]*>/g)) add('card', standalone ? `${folder}/src/feature.ts` : templateFile, tag[0], contexts, `${category}/${standalone ? 'standalone-inline' : 'module-external'}`);
    for (let j = 0; j < 8; j++) {
      const file = `${folder}/src/aux${j}.ts`, tag = `<super-cool label="aux-${i}-${j}" />`;
      await write(file, `import {Component} from '@angular/core';\nimport {SharedModule} from '@stress/shared';\n@Component({selector:'aux-${i}-${j}',imports:[SharedModule],template:'${tag}'}) export class Aux${j} {}\n`);
      add('card', file, tag, contexts, 'auxiliary-template');
    }
    for (let occurrence = 0; occurrence < 2; occurrence++) add('dialog', `${folder}/src/feature.ts`, 'CoolDialogComponent', contexts, occurrence ? 'direct-MatDialog-open' : 'dialog-import', occurrence, true);
    const tsconfig = `${folder}/tsconfig.lib.json`, anchor = { file: `${folder}/src/feature.ts` };
    const probes = [{ file: standalone ? anchor.file : templateFile, text: '<super-cool', offset: 1, ...(!standalone && { owner: anchor.file }) }];
    card.projects.push({ name, tsconfig, anchor, probes });
    dialog.projects.push({ name, tsconfig, anchor, backend: 'typescript', probes: [{ file: anchor.file, text: 'CoolDialogComponent' },
      { file: 'libs/legacy/src/page.ts', text: 'CoolDialogComponent', occurrence: 0 }] });
    configByContext[name] = tsconfig;
  }
  for (const app of apps) {
    const folder = await project(app, 'application', ['lib', 'spec', 'story']);
    const appFile = `${folder}/src/app.ts`;
    if (app === 'operations') {
      const tag = '<super-cool label="operations" />';
      await write(appFile, `import {Component} from '@angular/core';\nimport {SharedModule} from '@stress/shared';\nimport {ModernPanel} from '@stress/modern';\nimport {ReportPanel} from '@stress/reporting';\n@Component({imports:[SharedModule,ModernPanel,ReportPanel],template:'${tag}'}) export class OperationsApp {}\n`);
      card.projects.push({ name: app, tsconfig: `${folder}/tsconfig.lib.json`, anchor: { file: appFile }, probes: [{ file: appFile, text: '<super-cool', offset: 1 }] });
      dialog.projects.push({ name: app, tsconfig: `${folder}/tsconfig.lib.json`, anchor: { file: appFile }, backend: 'typescript',
        probes: [{ file: 'libs/legacy/src/page.ts', text: 'CoolDialogComponent', occurrence: 0 }] });
      add('card', appFile, tag, [app], 'third-app');
    }
    const chains = appGroups[app].map(g => (g + 1) * 16 - 1);
    await write(`${folder}/src/feature-registry.ts`, chains.map(i => `import {Feature${i}Module} from '@scale/${feature(i)}';`).join('\n') + `\nexport const features=[${chains.map(i => `Feature${i}Module`).join(',')}];\n`);
    configByContext[app] = `${folder}/tsconfig.lib.json`;
    for (const kind of ['spec', 'story']) {
      const file = `${folder}/src/${kind}.ts`, tag = `<super-cool label="${app}-${kind}" />`, context = `${app}:${kind}`;
      await write(file, `import {Component} from '@angular/core';\nimport {SharedModule} from '@stress/shared';\n@Component({imports:[SharedModule],template:'${tag}'}) export class ${kind === 'spec' ? 'Spec' : 'Story'}Host {}\n`);
      add('card', file, tag, [context], `${kind}-only`);
      const tsconfig = `${folder}/tsconfig.${kind}.json`, anchor = { file };
      card.projects.push({ name: app, tsconfig, anchor, probes: [{ file, text: '<super-cool', offset: 1 }] });
      dialog.projects.push({ name: app, tsconfig, anchor, backend: 'typescript',
        probes: [{ file: 'libs/legacy/src/page.ts', text: 'CoolDialogComponent', occurrence: 0 }] });
      configByContext[context] = tsconfig;
    }
    // Plain story render strings are candidates, not Angular-owned templates.
    await write(`${folder}/src/render-story.ts`, 'export const render = () => `<super-cool />`;\n');
  }
  await writeJson('tsconfig.base.json', base);
  await writeJson('lookup-card.json', card);
  // Source-authored context expansion; never consult returned LS references.
  for (const refs of Object.values(expected)) for (const ref of refs) {
    for (const app of apps) if (ref.contexts.includes(app)) ref.contexts.push(`${app}:spec`, `${app}:story`);
  }
  await writeJson('lookup-dialog.json', dialog);
  const oracle = { blueprint: { libraries: 54, apps: 3, features: 48, chains: 3, chainLength: 16, auxPerFeature: 8 }, targets: {} };
  for (const [target, refs] of Object.entries(expected)) {
    oracle.targets[target] = await Promise.all(refs.map(async ref => {
      const source = await readFile(path.join(workspace, ref.file), 'utf8');
      const escaped = ref.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = [...source.matchAll(new RegExp(ref.wholeWord ? `\\b${escaped}\\b` : escaped, 'g'))];
      const match = matches[ref.occurrence];
      if (!match) throw new Error(`Invalid authored expectation ${ref.file}: ${ref.text}`);
      const point = offset => { const lines = source.slice(0, offset).split('\n'); return { line: lines.length, column: lines.at(-1).length + 1 }; };
      return { file: ref.file, range: { start: point(match.index), end: point(match.index + ref.text.length) }, category: ref.category,
        contexts: [...new Set(ref.contexts.map(c => configByContext[c]))].sort() };
    }));
  }
  await writeFile(path.join(output, 'oracle.json'), `${JSON.stringify(oracle, null, 2)}\n`);
  await writeFile(path.join(output, 'source-hashes.json'), `${JSON.stringify(await hashes(), null, 2)}\n`);
  return oracle;
}

export async function hashes() {
  const files = (await readdir(workspace, { recursive: true })).filter(f => /\.(ts|html|json|txt)$/.test(f) && !f.startsWith('.nx/')).sort();
  return Object.fromEntries(await Promise.all(files.map(async file => [file, digest(await readFile(path.join(workspace, file)))])));
}
