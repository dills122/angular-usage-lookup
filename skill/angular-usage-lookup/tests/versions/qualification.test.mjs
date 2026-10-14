import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collect } from '../../scripts/collect-references.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const exec = promisify(execFile);
const cases = [
  { symbol: 'FancyDirective', probe: 'fancy', uses: ['fancy', 'cool></button>', 'wrapped [power]'] },
  { symbol: 'WrappedDirective', probe: 'wrapped', uses: ['wrapped [power]'] },
  { symbol: 'FormatPipe', member: 'transform', probe: 'format}}', uses: ['format}}'] },
  { symbol: 'ButtonComponent', probe: 'superButton', uses: ['superButton fancy', 'superButton></a>'] },
  { symbol: 'FancyDirective', member: 'strength', probe: 'glow]', uses: ['glow]', 'power]'] },
  { symbol: 'FancyDirective', member: 'changed', probe: 'glowed)', uses: ['glowed)', 'powered)'] },
];
const modern = [
  { symbol: 'SignalCard', uses: ['<signal-card [caption]="name" (selected)="name=$event" [(count)]="count" />', '<signal-card caption="if" />', '<signal-card [caption]="row" />', '<signal-card caption="defer" />'] },
  { symbol: 'SignalCard', member: 'label', uses: ['caption]="name"', 'caption="if"', 'caption]="row"', 'caption="defer"'] },
  { symbol: 'SignalCard', member: 'selected', uses: ['selected)="name=$event"'] },
  { symbol: 'SignalCard', member: 'count', uses: ['count)]="count"'] },
];

for (const major of [20, '20-patch', 22]) test(`Angular ${major}: Nx, API shapes, signal APIs and control flow`, { timeout: 240000 }, async () => {
  const profile = path.join(root, `tests/versions/angular${major}`);
  const require = createRequire(path.join(profile, 'package.json'));
  const workspace = path.join(profile, 'test-output/workspace');
  const output = path.join(root, `test-output/versions/angular${major}`);
  await rm(workspace, { recursive: true, force: true });
  await mkdir(workspace, { recursive: true });
  await mkdir(output, { recursive: true });
  const write = async (file, text) => { await mkdir(path.dirname(path.join(workspace, file)), { recursive: true }); await writeFile(path.join(workspace, file), text); };
  const json = (file, value) => write(file, JSON.stringify(value, null, 2));
  await cp(path.join(root, 'tests/fixtures/api-shapes'), path.join(workspace, 'libs/api'), { recursive: true });
  await json('package.json', { name: `qualified-angular-${major}`, private: true });
  await json('nx.json', {});
  await write('apps/modern/src/card.ts', `import {Component, input, output, model} from '@angular/core';
@Component({selector:'signal-card',template:'<ng-content />'})
export class SignalCard { label=input.required<string>({alias:'caption'}); selected=output<string>(); count=model(0); }
`);
  await write('apps/modern/src/consumer.ts', `import {Component} from '@angular/core';
import {SignalCard} from './card';
@Component({imports:[SignalCard],templateUrl:'./screen.html'})
export class ModernConsumer { name='a'; count=0; rows=['a']; }
// SignalCard <signal-card caption="comment" />
export const plain = '<signal-card caption="string" />';
`);
  await write('apps/modern/src/screen.html', `${modern[0].uses[0]}\n@if (name) { ${modern[0].uses[1]} }\n@for (row of rows; track row) { ${modern[0].uses[2]} }\n@defer { ${modern[0].uses[3]} }\n<!-- <signal-card caption="comment" /> -->\n`);
  await json('apps/modern/tsconfig.json', { compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
    experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true }, angularCompilerOptions: { strictTemplates: true }, include: ['src/**/*.ts'] });
  const compiler = path.resolve(path.dirname(require.resolve('@angular/compiler-cli/package.json')), require('@angular/compiler-cli/package.json').bin.ngc);
  for (const folder of ['libs/api', 'apps/modern']) await json(`${folder}/project.json`, { name: folder.split('/')[1], root: folder,
    projectType: folder.startsWith('apps') ? 'application' : 'library', sourceRoot: `${folder}/src`, targets: {
      typecheck: { executor: 'nx:run-commands', options: { command: `node ${JSON.stringify(compiler)} -p ${folder}/tsconfig.json --noEmit`, forwardAllArgs: false } } } });
  const files = (await readdir(workspace, { recursive: true })).filter(f => /\.(ts|html|json)$/.test(f));
  const before = Object.fromEntries(await Promise.all(files.map(async f => [f, await readFile(path.join(workspace, f), 'utf8')])));
  const nx = path.resolve(path.dirname(require.resolve('nx/package.json')), require('nx/package.json').bin.nx);
  const env = { ...process.env, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_INTERACTIVE: 'false' };
  const compiled = await exec(process.execPath, [nx, 'run-many', '-t', 'typecheck', '--all', '--parallel=2', '--skip-nx-cache'], { cwd: workspace, env, timeout: 90000 });
  await writeFile(path.join(output, 'typecheck.log'), compiled.stdout + compiled.stderr);
  const summaries = [];
  for (const [folder, items, consumer] of [['libs/api', cases, 'src/consumer.ts'], ['apps/modern', modern, 'src/screen.html']]) {
    for (const item of items) {
      const source = before[`${folder}/${consumer}`];
      const file = `${folder}/${consumer}`;
      const points = item.uses.map(token => { const offset = source.indexOf(token); assert.ok(offset >= 0); const lines = source.slice(0, offset).split('\n');
        return { line: lines.length, column: lines.at(-1).length + 1 + (token.startsWith('<') ? 1 : 0) }; });
      const report = await collect(workspace, { target: { file: `${folder}/src/${folder === 'libs/api' ? 'types' : 'card'}.ts`, symbol: item.symbol,
        ...(item.member && { member: item.member }) }, projects: [{ name: folder, tsconfig: `${folder}/tsconfig.json`, anchor: { file: `${folder}/src/consumer.ts` },
        probes: [{ file, text: item.probe ?? item.uses[0], offset: item.uses[0].startsWith('<') ? 1 : 0, ...(file.endsWith('.html') && { owner: `${folder}/src/consumer.ts` }) }] }] });
      await writeFile(path.join(output, `${item.symbol}${item.member ? '.' + item.member : ''}.json`), JSON.stringify(report, null, 2));
      assert.equal(report.run.versions.angular, require('@angular/core/package.json').version);
      assert.equal(report.run.versions.typescript, require('typescript').version);
      assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.coverage.map(r => r.error)));
      const contains = (ref, point) => ref.file === file && ref.range.start.line === point.line && ref.range.start.column <= point.column && ref.range.end.column > point.column;
      assert.ok(points.every(point => report.references.some(ref => contains(ref, point))), `${item.symbol}.${item.member}: all authored uses must be found`);
      const negative = source.indexOf('cool disabled');
      if (negative >= 0) { const lines = source.slice(0, negative).split('\n'); assert.ok(!report.references.some(ref => contains(ref, { line: lines.length, column: lines.at(-1).length + 1 }))); }
      assert.ok(!report.references.some(ref => before[ref.file]?.split('\n')[ref.range.start.line - 1]?.trimStart().startsWith('//') || before[ref.file]?.split('\n')[ref.range.start.line - 1]?.startsWith('export const plain') || before[ref.file]?.split('\n')[ref.range.start.line - 1]?.startsWith('<!--')));
      for (const row of report.coverage) { assert.equal(row.process.exited, true); assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' }); }
      summaries.push({ symbol: item.symbol, member: item.member, expectedUses: points.length, status: 'passed', versions: report.run.versions });
    }
  }
  for (const [file, text] of Object.entries(before)) assert.equal(await readFile(path.join(workspace, file), 'utf8'), text, 'Lookup remains read-only');
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(summaries, null, 2));
});
