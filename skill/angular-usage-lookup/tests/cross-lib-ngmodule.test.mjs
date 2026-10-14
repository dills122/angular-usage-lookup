import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collect } from '../scripts/collect-references.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);
const owner = 'libs/clients/src/search.component.ts';
const template = 'libs/clients/src/search.component.html';
const sourceTarget = 'libs/table/src/search-table.component.ts';
const declarationTarget = 'dist/table/search-table.component.d.ts';

async function fixture(major, mode) {
  assert.match(major, /^(?:20|20-patch|21|22)$/, 'Use an installed qualification profile');
  const profile = major === '21' ? root : path.join(root, `tests/versions/angular${major}`);
  const require = createRequire(path.join(profile, 'package.json'));
  const workspace = path.join(profile, 'test-output', `cross-lib-${mode}`);
  const output = path.join(root, 'test-output/cross-lib', String(major), mode);
  await rm(workspace, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const write = async (file, text) => {
    await mkdir(path.dirname(path.join(workspace, file)), { recursive: true });
    await writeFile(path.join(workspace, file), text);
  };
  const json = (file, value) => write(file, JSON.stringify(value, null, 2));
  await json('package.json', { name: 'cross-lib-ngmodule', private: true });
  await json('nx.json', {});
  await json('tsconfig.base.json', {
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
      experimentalDecorators: true, strict: true, skipLibCheck: true,
      paths: { '@fixture/table': [mode.startsWith('declarations') ? './dist/table/index.d.ts' : './libs/table/src/index.ts'] } },
    angularCompilerOptions: { strictTemplates: true },
  });
  await write(sourceTarget, `import { Component, Input } from '@angular/core';
@Component({selector: 'fixture-search-table', standalone: false, template: '{{label}}'})
export class SearchTableComponent { @Input() label = ''; }
`);
  await write('libs/table/src/table.module.ts', `import { NgModule } from '@angular/core';
import { SearchTableComponent } from './search-table.component';
@NgModule({declarations: [SearchTableComponent], exports: [SearchTableComponent]})
export class TableModule {}
`);
  await write('libs/table/src/index.ts', "export { SearchTableComponent } from './search-table.component';\nexport { TableModule } from './table.module';\n");
  await write(owner, `import { Component } from '@angular/core';
@Component({selector: 'fixture-search', standalone: false, templateUrl: './search.component.html'})
export class SearchComponent {}
`);
  await write(template, '<fixture-search-table label="known consumer"></fixture-search-table>\n');
  await write('libs/clients/src/pages.ts', "import { SearchComponent } from './search.component';\nexport const PAGES = [SearchComponent];\n");
  await write('libs/clients/src/clients.module.ts', `import { NgModule } from '@angular/core';
import { TableModule } from '@fixture/table';
import { PAGES } from './pages';
@NgModule({imports: ${mode === 'missing-import' ? '[]' : '[TableModule]'}, declarations: [...PAGES]})
export class ClientsModule {}
`);
  await json('libs/table/tsconfig.lib.json', { extends: '../../tsconfig.base.json', compilerOptions: {
    rootDir: 'src', outDir: '../../dist/table', declaration: true, declarationMap: mode !== 'declarations-no-map' },
    angularCompilerOptions: { compilationMode: 'partial' }, include: ['src/**/*.ts'] });
  await json('libs/clients/tsconfig.lib.json', { extends: '../../tsconfig.base.json', compilerOptions: { noEmit: true }, include: ['src/**/*.ts'] });
  for (const name of ['table', 'clients']) await json(`libs/${name}/tsconfig.json`, { files: [], references: [{ path: './tsconfig.lib.json' }] });
  for (const name of ['table', 'clients']) await json(`libs/${name}/project.json`, {
    name, root: `libs/${name}`, sourceRoot: `libs/${name}/src`, projectType: 'library',
    targets: { typecheck: { executor: 'nx:run-commands', options: { command: `ngc -p libs/${name}/tsconfig.lib.json --noEmit` } } },
  });
  const compiler = path.resolve(path.dirname(require.resolve('@angular/compiler-cli/package.json')), require('@angular/compiler-cli/package.json').bin.ngc);
  const compile = async config => {
    try {
      const result = await exec(process.execPath, [compiler, '-p', config], { cwd: workspace, timeout: 60000 });
      return { status: 0, stdout: result.stdout, stderr: result.stderr };
    } catch (error) { return { status: error.code, stdout: error.stdout, stderr: error.stderr }; }
  };
  if (mode.startsWith('declarations')) {
    const build = await compile('libs/table/tsconfig.lib.json');
    await writeFile(path.join(output, 'library-build.json'), JSON.stringify(build, null, 2));
    assert.equal(build.status, 0, build.stderr);
    assert.match(await readFile(path.join(workspace, declarationTarget), 'utf8'), /ɵɵComponentDeclaration/);
    assert.match(await readFile(path.join(workspace, 'dist/table/table.module.d.ts'), 'utf8'), /ɵɵNgModuleDeclaration/);
  }
  const compilation = await compile('libs/clients/tsconfig.lib.json');
  await writeFile(path.join(output, 'consumer-typecheck.json'), JSON.stringify(compilation, null, 2));
  if (mode === 'missing-import') {
    assert.notEqual(compilation.status, 0);
    assert.match(compilation.stderr, /NG8001|not a known element/);
  } else assert.equal(compilation.status, 0, compilation.stderr);
  const files = (await readdir(workspace, { recursive: true })).filter(file => /\.(ts|html|json|map)$/.test(file));
  const before = Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(path.join(workspace, file), 'utf8')])));
  return { workspace, output, before };
}

for (const major of (process.env.LOOKUP_CROSS_LIB_MAJORS ?? '21').split(',')) for (const mode of ['source', 'declarations', 'declarations-no-map', 'missing-import']) {
  test(`Angular ${major}: cross-library NgModule with spread declarations via ${mode}`, { timeout: 120000 }, async () => {
    const { workspace, output, before } = await fixture(major, mode);
    // Angular maps declaration definitions back to source when ngc emitted maps.
    // Without maps, the exact requested identity is the consumed declaration.
    const manifest = {
      target: { file: mode === 'declarations-no-map' ? declarationTarget : sourceTarget, symbol: 'SearchTableComponent' },
      projects: [{ name: 'clients', tsconfig: 'libs/clients/tsconfig.lib.json', anchor: { file: 'libs/clients/src/clients.module.ts' },
        probes: [{ file: template, owner, text: 'fixture-search-table', offset: 1 }],
        candidates: [{ file: template, owner, text: 'fixture-search-table', offset: 1 }],
      }],
    };
    const report = await collect(workspace, manifest, 30000);
    await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    assert.equal(report.collectionStatus, mode === 'missing-import' ? 'failed' : 'succeeded', JSON.stringify(report.coverage.map(row => row.error)));
    assert.equal(report.coverage[0].probes[0].resolvesToTarget, mode !== 'missing-import');
    if (mode !== 'missing-import') {
      assert.ok(report.references.some(ref => ref.file === template && ref.range.start.line === 1 && ref.range.start.column <= 2 && ref.range.end.column > 2));
      assert.equal(report.candidateEvidence[0].status, 'confirmed');
    } else {
      assert.equal(report.references.length, 0);
      assert.match(report.coverage[0].error, /template token resolves only to DOM declarations.*NgModule imports\/exports/);
      assert.ok(JSON.stringify(report.coverage[0].probes[0].definitions).includes('lib.dom.d.ts'));
    }
    if (mode.startsWith('declarations')) {
      const wrongIdentity = structuredClone(manifest);
      wrongIdentity.target.file = mode === 'declarations' ? declarationTarget : sourceTarget;
      const mismatch = await collect(workspace, wrongIdentity, 30000);
      await writeFile(path.join(output, 'identity-mismatch.json'), JSON.stringify(mismatch, null, 2));
      assert.equal(mismatch.collectionStatus, 'failed', 'Source and declaration identities must not be conflated');
      assert.equal(mismatch.coverage[0].probes[0].resolvesToTarget, false);
      assert.equal(mismatch.references.length, 0);
      assert.equal(mismatch.coverage[0].process.exited, true);
      assert.throws(() => process.kill(mismatch.coverage[0].process.pid, 0), { code: 'ESRCH' });
    }
    assert.equal(report.coverage[0].process.exited, true);
    assert.throws(() => process.kill(report.coverage[0].process.pid, 0), { code: 'ESRCH' });
    for (const [file, text] of Object.entries(before)) assert.equal(await readFile(path.join(workspace, file), 'utf8'), text, `Lookup is read-only: ${file}`);
  });
}
