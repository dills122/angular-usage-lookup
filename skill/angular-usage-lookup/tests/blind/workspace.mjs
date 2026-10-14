// Authored fixture construction. Expectations never come from backend results.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function logicalInventory(oracle) {
  return oracle.occurrences.map(({ id, target, roles }) => ({ id, target, roles })).sort((a, b) => a.id.localeCompare(b.id));
}

export async function generate(workspace, variant) {
  if (!['baseline', 'transformed'].includes(variant)) throw new Error('Unknown fixture variant');
  const moved = variant === 'transformed', ui = moved ? 'packages/surfaces' : 'libs/ui';
  const target = moved ? 'BeaconPane' : 'PrismCard', selector = moved ? 'shifted-surface' : 'prism-card';
  const attribute = moved ? 'shiftedSurface' : 'prismCard', alias = moved ? 'LocalSurface' : target;
  const occurrences = [], configs = [], files = {}, marks = new Map();
  const tag = (id, text, target, roles) => {
    if (marks.has(id)) throw new Error(`Duplicate authored marker ${id}`);
    marks.set(id, { id, text, target, roles });
    return `⟦${id}⟧${text}⟦/${id}⟧`;
  };
  function source(file, text) {
    let clean = '', last = 0;
    for (const match of text.matchAll(/⟦([^/][^⟧]*)⟧([\s\S]*?)⟦\/\1⟧/g)) {
      clean += text.slice(last, match.index);
      const point = offset => { const lines = (clean + match[2]).slice(0, offset).split('\n'); return { line: lines.length, column: lines.at(-1).length + 1 }; };
      occurrences.push({ ...marks.get(match[1]), file, range: { start: point(clean.length), end: point(clean.length + match[2].length) } });
      clean += match[2]; last = match.index + match[0].length;
    }
    clean += text.slice(last);
    if (clean.includes('⟦')) throw new Error('Unexpanded authored marker');
    files[file] = clean;
  }
  const json = (file, value) => source(file, JSON.stringify(value, null, 2));
  json('package.json', { name: `blind-${variant}`, private: true });
  json('nx.json', {});
  json('tsconfig.base.json', { compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', experimentalDecorators: true,
    strict: true, skipLibCheck: true, noEmit: true, baseUrl: '.', paths: { '@case/ui': [`${ui}/src/index.ts`] } }, angularCompilerOptions: { strictTemplates: true } });
  source(`${ui}/src/card.ts`, `import {Component, input} from '@angular/core';\n@Component({selector:'${selector},section[${attribute}]', template:'<ng-content />'})\nexport class ${target}<T = unknown> { value=input<T>(); label=input(''); }\n`);
  source(`${ui}/src/index.ts`, moved ? "export {Surface} from './barrel';\n" : `export {${target}} from './card';\n`);
  if (moved) source(`${ui}/src/barrel.ts`, `export {${target} as Surface} from './card';\n`);
  function project(folder, name, types) {
    const targets = {};
    for (const [kind, roots] of Object.entries(types)) {
      const config = `${folder}/tsconfig.${kind}.json`;
      configs.push({ role: `${name}:${kind}`, file: config });
      json(config, { extends: '../../tsconfig.base.json', files: roots });
      targets[`check-${kind}`] = { executor: 'nx:run-commands', options: { command: `ngc -p ${config} --noEmit`, forwardAllArgs: false, tsConfig: config } };
    }
    json(`${folder}/tsconfig.json`, { extends: '../../tsconfig.base.json', files: [], references: Object.keys(types).map(k => ({ path: `./tsconfig.${k}.json` })) });
    json(`${folder}/project.json`, { name, projectType: ['ui', 'shadow'].includes(name) ? 'library' : 'application', root: folder, sourceRoot: `${folder}/src`, targets });
  }
  project(ui, 'ui', { lib: ['src/index.ts'] });
  const dependencies = `${alias}, ${moved ? 'Choice' : 'MatOption'}, ${moved ? 'Indent' : 'MatTreeNodePadding'}`;
  const imports = `import {Component} from '@angular/core';\nimport {${moved ? `Surface as ${alias}` : target}} from '@case/ui';\nimport {MatOption${moved ? ' as Choice' : ''}} from '@angular/material/core';\nimport {MatTreeNodePadding${moved ? ' as Indent' : ''}} from '@angular/material/tree';\n`;
  for (const app of ['store', 'admin']) {
    const folder = moved ? `clients/${app === 'store' ? 'shopfront' : 'backoffice'}` : `apps/${app}`;
    const main = moved ? 'src/panels/site.ts' : 'src/main.ts';
    function template(kind, roles, count) {
      let html = '';
      for (let i = 0; i < count; i++) {
        const card = i % 2 ? `<section ${attribute} label="${kind}-${i}">` : `<${selector} label="${kind}-${i}">`;
        const row = `${tag(`${app}-${kind}-${i}-card`, card, 'card', roles)}${i % 2 ? '</section>' : `</${selector}>`}${tag(`${app}-${kind}-${i}-option`, '<mat-option [value]="1">', 'option', roles)}One</mat-option>${tag(`${app}-${kind}-${i}-padding`, '<div matTreeNodePadding>', 'padding', roles)}</div>`;
        html += (i === 1 ? `@if (visible) { ${row} }` : i === 2 ? `@for (entry of entries; track entry) { ${row} }` : i === 3 ? `@defer { ${row} }` : row) + '\n';
      }
      return html;
    }
    const mainTemplate = template('main', ['app', 'spec', 'story'].map(k => `${app}:${k}`), 4) + `<!-- <${selector}></${selector}><mat-option></mat-option><div matTreeNodePadding></div> -->\n<div ngNonBindable><${selector}></${selector}><mat-option></mat-option><div matTreeNodePadding></div></div>\n`;
    const prefix = moved ? '// relocated consumer\r\n// 😀 UTF-16 control\r\n\r\n' : '';
    if (moved) {
      source(`${folder}/src/views/moved screen.html`, '😀\r\n' + mainTemplate.replaceAll('\n', '\r\n'));
      source(`${folder}/${main}`, prefix + imports + `@Component({selector:'${app}-root',imports:[${dependencies}],templateUrl:'../views/moved screen.html'})\nexport class MainHost { visible=true; entries=[1]; }\n`);
    } else source(`${folder}/${main}`, imports + `@Component({selector:'${app}-root',imports:[${dependencies}],template:\`\n${mainTemplate}\`})\nexport class MainHost { visible=true; entries=[1]; }\n`);
    for (const kind of ['spec', 'story']) source(`${folder}/src/${kind}.ts`, prefix + imports + `import {MainHost} from '${moved ? './panels/site' : './main'}';\nexport const registered=MainHost;\n@Component({imports:[${dependencies}],template:\`${template(kind, [`${app}:${kind}`], 1)}\`})\nexport class ${kind === 'spec' ? 'Test' : 'Story'}Host {}\n`);
    source(`${folder}/src/notes.ts`, `// <${selector}></${selector}>\nexport const markup='<${selector}></${selector}><mat-option></mat-option><div matTreeNodePadding></div>';\n`);
    project(folder, app, { app: [main, 'src/notes.ts'], spec: ['src/spec.ts', 'src/notes.ts'], story: ['src/story.ts', 'src/notes.ts'] });
  }
  const shadow = moved ? 'packages/decoys' : 'libs/shadow';
  source(`${shadow}/src/shadow.ts`, `import {Component, Directive} from '@angular/core';\n@Component({selector:'${selector},section[${attribute}]',template:''}) export class ${target} {}\n@Component({selector:'mat-option',template:''}) export class MatOption {}\n@Directive({selector:'[matTreeNodePadding]'}) export class MatTreeNodePadding {}\n@Component({imports:[${target},MatOption,MatTreeNodePadding],template:'<${selector}></${selector}><section ${attribute}></section><mat-option></mat-option><div matTreeNodePadding></div>'}) export class ShadowHost {}\n`);
  project(shadow, 'shadow', { lib: ['src/shadow.ts'] });
  const configByRole = Object.fromEntries(configs.map(c => [c.role, c.file]));
  for (const occurrence of occurrences) occurrence.contexts = occurrence.roles.map(role => configByRole[role]).sort();
  await mkdir(workspace, { recursive: true });
  for (const [file, content] of Object.entries(files)) { await mkdir(path.dirname(path.join(workspace, file)), { recursive: true }); await writeFile(path.join(workspace, file), content); }
  return { variant, targets: { card: { symbol: target, file: `${ui}/src/card.ts` }, option: { symbol: 'MatOption', package: '@angular/material/core' },
    padding: { symbol: 'MatTreeNodePadding', package: '@angular/material/tree' } }, configs, occurrences, files: Object.keys(files) };
}
