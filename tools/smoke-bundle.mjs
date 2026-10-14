// Exercise the extracted, production-only bundle; framework deps belong to the fixture workspace.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, cp, symlink, rm, mkdir, writeFile, readdir, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const skill = path.join(root, 'skill/angular-usage-lookup');
const pkg = JSON.parse(await readFile(path.join(skill, 'package.json'), 'utf8'));
const zip = path.join(root, `dist/angular-usage-lookup-${pkg.version}.zip`);
const checksum = (await readFile(`${zip}.sha256`, 'utf8')).split(/\s+/)[0];
assert.equal(createHash('sha256').update(await readFile(zip)).digest('hex'), checksum);
const temporary = await realpath(await mkdtemp(path.join(tmpdir(), 'angular-usage-bundle-')));
const evidence = [];
try {
  await exec('python3', ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, temporary]);
  const installed = path.join(temporary, 'angular-usage-lookup');
  await exec('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: installed, timeout: 180000, maxBuffer: 2 ** 22 });
  // Prove dev packages do not accidentally supply the bundled helper's runtime.
  await assert.rejects(readFile(path.join(installed, 'node_modules/@angular/material/package.json')), { code: 'ENOENT' });
  for (const [fixture, manifestFile, expectedFile] of [
    ['angular-single', 'lookup.json', 'expected.json'],
    ['nx-stress', 'lookup-dialog.json', 'expected-dialog.json'],
  ]) {
    const workspace = path.join(temporary, fixture);
    await cp(path.join(skill, 'tests/fixtures', fixture), workspace, { recursive: true,
      filter: source => !source.split(path.sep).some(p => ['node_modules', '.nx', 'dist'].includes(p)) });
    // Expose application dependencies without the checkout's language tools.
    // A whole-node_modules link would bypass the extracted helper fallback.
    const dependencyRoot = path.join(skill, 'node_modules');
    const workspaceModules = path.join(workspace, 'node_modules');
    await mkdir(workspaceModules);
    for (const entry of await readdir(dependencyRoot)) {
      if (entry.startsWith('.')) continue;
      if (entry.startsWith('@')) {
        await mkdir(path.join(workspaceModules, entry));
        for (const name of await readdir(path.join(dependencyRoot, entry))) {
          if (entry === '@angular' && ['language-server', 'language-service'].includes(name)) continue;
          await symlink(path.join(dependencyRoot, entry, name), path.join(workspaceModules, entry, name), 'dir');
        }
      } else await symlink(path.join(dependencyRoot, entry), path.join(workspaceModules, entry), 'dir');
    }
    const { qualifiedToolchain } = await import(pathToFileURL(path.join(installed, 'scripts/qualified-toolchain.mjs')));
    const selected = qualifiedToolchain(workspace);
    assert.equal(selected.serverFile, path.join(installed, 'node_modules/@angular/language-server/package.json'));
    assert.equal(selected.serviceFile, path.join(installed, 'node_modules/@angular/language-service/package.json'));
    const output = path.join(temporary, `${fixture}-report.json`);
    await exec(process.execPath, [path.join(installed, 'scripts/collect-references.mjs'), '--workspace', workspace,
      '--manifest', manifestFile, '--output', output], { timeout: 120000, maxBuffer: 2 ** 22 });
    const report = JSON.parse(await readFile(output, 'utf8'));
    const expected = JSON.parse(await readFile(path.join(workspace, expectedFile), 'utf8'));
    const key = r => `${r.file}:${JSON.stringify(r.range)}`;
    const wanted = [];
    for (const ref of expected.references) {
      if (ref.range) { wanted.push(ref); continue; }
      const source = await readFile(path.join(workspace, ref.file), 'utf8');
      const escaped = ref.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = [...source.matchAll(new RegExp(ref.wholeWord ? `\\b${escaped}\\b` : escaped, 'g'))][ref.occurrence ?? 0];
      assert.ok(match, `Expected fixture location: ${ref.file} ${ref.text}`);
      const point = index => { const lines = source.slice(0, index).split('\n'); return { line: lines.length, column: lines.at(-1).length + 1 }; };
      wanted.push({ file: ref.file, range: { start: point(match.index), end: point(match.index + ref.text.length) } });
    }
    assert.equal(report.collectionStatus, 'succeeded');
    assert.equal(report.status, 'partial');
    assert.deepEqual(report.references.map(key).sort(), wanted.map(key).sort());
    const config = JSON.parse(await readFile(path.join(workspace, manifestFile), 'utf8'));
    assert.deepEqual(report.coverage.map(r => r.project).sort(), config.projects.map(p => p.name).sort());
    for (const row of report.coverage) if (row.process) {
      assert.ok(row.toolchainEvidence.some(message => message.startsWith(`Using @angular/language-service v${selected.service.version} from ${installed}/node_modules/`)), 'Actual server must load the extracted production service');
      assert.equal(row.process.exited, true);
      assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
    }
    evidence.push({ fixture, backend: report.coverage[0].backend, references: report.references.length, status: report.collectionStatus });
    if (fixture === 'angular-single') {
      const discovery = await exec(process.execPath, [path.join(installed, 'scripts/discover.mjs'), '--workspace', workspace], { timeout: 60000 });
      const inventory = JSON.parse(discovery.stdout);
      assert.equal(inventory.projects.length, 1);
      evidence.push({ helper: 'discovery', projects: inventory.projects.length });
    } else {
      const generated = await exec(process.execPath, [path.join(installed, 'scripts/material-catalog.mjs'), '--workspace', workspace], { timeout: 60000, maxBuffer: 8 * 2 ** 20 });
      const catalog = JSON.parse(generated.stdout);
      assert.equal(catalog.coverage.typedEntrypoints.length, 74);
      assert.equal(Object.keys(catalog.families).length, 37);
      assert.equal(catalog.programmaticRules.length, 3);
      evidence.push({ helper: 'material-catalog', typedEntrypoints: 74, families: 37, programmaticRules: 3 });
    }
  }
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  await writeFile(path.join(root, 'test-output/bundle-smoke.json'), JSON.stringify({ version: pkg.version, node: process.version, productionInstall: true, evidence }, null, 2));
  console.log(JSON.stringify(evidence));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
