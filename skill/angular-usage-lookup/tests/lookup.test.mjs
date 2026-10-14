import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, readdir, mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));

async function hashSources(folder) {
  const files = await readdir(folder, { recursive: true, withFileTypes: true });
  const hashes = {};
  for (const entry of files) {
    if (!entry.isFile() || !/\.(ts|html|json)$/.test(entry.name)) continue;
    const full = path.join(entry.parentPath, entry.name);
    if (full.includes(`${path.sep}.nx${path.sep}`)) continue;
    hashes[path.relative(folder, full)] = createHash('sha256').update(await readFile(full)).digest('hex');
  }
  return hashes;
}

// Expected locations are declared in the fixture, independently of the collector.
async function expectedLocations(workspace, expected) {
  return Promise.all(expected.references.map(async ({ file, text, occurrence, wholeWord }) => {
    const source = await readFile(path.join(workspace, file), 'utf8');
    const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(wholeWord ? `\\b${escaped}\\b` : escaped, 'g');
    const match = [...source.matchAll(pattern)][occurrence];
    assert.ok(match, `Expected fixture occurrence must exist: ${file} ${text} #${occurrence}`);
    const before = source.slice(0, match.index).split('\n');
    return `${file}:${before.length}:${before.at(-1).length + 1}-${before.length}:${before.at(-1).length + 1 + text.length}`;
  }));
}

async function verifyFixture(name, projectNames) {
  const workspace = path.join(root, 'tests/fixtures', name);
  const before = await hashSources(workspace);
  const expected = JSON.parse(await readFile(path.join(workspace, 'expected.json'), 'utf8'));
  const wanted = (await expectedLocations(workspace, expected)).sort();
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  const output = path.join(root, 'test-output', `${name}.json`);
  await exec(process.execPath, [path.join(root, 'scripts/collect-references.mjs'),
    '--workspace', workspace, '--manifest', 'lookup.json', '--output', output],
  { cwd: root, timeout: 60000, maxBuffer: 1024 * 1024 });
  const report = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(report.schemaVersion, 'angular-usage-lookup/v1');
  assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.gaps));
  assert.equal(report.status, 'partial', 'A semantic collection alone has not reconciled collateral/dynamic candidates');
  assert.deepEqual(report.coverage.map(c => c.project).sort(), projectNames.sort());
  assert.ok(report.coverage.every(c => c.result === 'verified' && c.probes.every(p => p.resolvesToTarget)));
  const actual = report.references.map(r => `${r.file}:${r.range.start.line}:${r.range.start.column}-${r.range.end.line}:${r.range.end.column}`).sort();
  assert.deepEqual(actual, wanted, 'Every known reference, no false positives or duplicates');
  for (const forbidden of expected.forbiddenFiles) assert.ok(!report.references.some(r => r.file === forbidden));
  assert.equal(report.references.filter(r => r.isDeclaration).length, 1);
  assert.ok(report.references.every(r => r.contexts.length && r.evidence.length && r.fileHash));
  for (const row of report.coverage) {
    assert.equal(row.process.exited, true);
    assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' }, 'Child process must actually be gone');
  }
  if (name === 'nx-two') for (const ref of report.references) {
    const projects = ref.contexts.map(c => c.project).sort();
    assert.deepEqual(projects, ref.file.startsWith('shared/') ? ['alpha', 'beta'] : [ref.file.split('/')[1]]);
  }
  assert.deepEqual(await hashSources(workspace), before, 'Lookup must not mutate fixture sources/configs');
}

test('Angular 21: class -> inline/external templates and TS references, without unrelated matches', { timeout: 70000 }, async () => {
  await verifyFixture('angular-single', ['single']);
});

test('Nx: both independent configs contribute usages through a shared barrel/path alias', { timeout: 70000 }, async () => {
  await verifyFixture('nx-two', ['alpha', 'beta']);
});

test('Discovery: local Nx CLI identifies both projects and their leaf configs', async () => {
  const workspace = path.join(root, 'tests/fixtures/nx-two');
  const { stdout } = await exec(process.execPath, [path.join(root, 'scripts/discover.mjs'), '--workspace', workspace], { timeout: 30000 });
  const report = JSON.parse(stdout);
  assert.equal(report.backend, 'nx-cli');
  assert.equal(report.versions.nx, '23.3.0');
  assert.deepEqual(report.projects.map(p => p.name).sort(), ['alpha', 'beta']);
  for (const project of report.projects) {
    assert.deepEqual(project.configs.filter(c => c.rootFileCount > 0).map(c => c.file), [`apps/${project.name}/tsconfig.app.json`]);
    assert.ok(project.configs.every(c => c.errors.length === 0));
  }
});

test('Initialization timeout is a failed partial collection and terminates its child', async () => {
  const { collect } = await import('../scripts/collect-references.mjs');
  const workspace = path.join(root, 'tests/fixtures/angular-single');
  const manifest = JSON.parse(await readFile(path.join(workspace, 'lookup.json'), 'utf8'));
  const report = await collect(workspace, manifest, 1);
  assert.equal(report.collectionStatus, 'failed');
  assert.equal(report.status, 'partial');
  assert.match(report.coverage[0].error, /timeout/);
  assert.equal(report.coverage[0].process.exited, true);
  assert.throws(() => process.kill(report.coverage[0].process.pid, 0), { code: 'ESRCH' });
});

test('Missing Nx config keeps the other project evidence and reports the gap', async () => {
  const { collect } = await import('../scripts/collect-references.mjs');
  const workspace = path.join(root, 'tests/fixtures/nx-two');
  const manifest = JSON.parse(await readFile(path.join(workspace, 'lookup.json'), 'utf8'));
  manifest.projects[1].tsconfig = 'missing.json';
  const report = await collect(workspace, manifest);
  assert.equal(report.collectionStatus, 'failed');
  assert.deepEqual(report.coverage.map(c => c.result), ['verified', 'failed']);
  assert.ok(report.gaps.some(g => g.code === 'project-analysis-failed' && g.project === 'beta'));
  assert.ok(report.references.length > 0);
  assert.ok(report.references.every(r => r.contexts.every(c => c.project === 'alpha')));
});

test('A same-selector probe resolving to the wrong class cannot verify a config', async () => {
  const { collect } = await import('../scripts/collect-references.mjs');
  const workspace = path.join(root, 'tests/fixtures/angular-single');
  const manifest = JSON.parse(await readFile(path.join(workspace, 'lookup.json'), 'utf8'));
  manifest.projects[0].probes = [{ file: 'src/unrelated.ts', text: '<super-cool', offset: 1 }];
  const report = await collect(workspace, manifest);
  assert.equal(report.collectionStatus, 'failed');
  assert.equal(report.coverage[0].probes[0].resolvesToTarget, false);
  assert.equal(report.references.length, 0);
});

test('Fixtures compile with Angular ngc; Nx executes both typecheck targets', { timeout: 60000 }, async () => {
  const require = createRequire(import.meta.url);
  const ngc = path.resolve(path.dirname(require.resolve('@angular/compiler-cli/package.json')), require('@angular/compiler-cli/package.json').bin.ngc);
  await exec(process.execPath, [ngc, '-p', 'tests/fixtures/angular-single/tsconfig.json', '--noEmit'], { cwd: root, timeout: 30000 });
  const nx = path.resolve(path.dirname(require.resolve('nx/package.json')), require('nx/package.json').bin.nx);
  await exec(process.execPath, [nx, 'run-many', '-t', 'typecheck', '--projects=alpha,beta', '--skip-nx-cache'], {
    cwd: path.join(root, 'tests/fixtures/nx-two'), timeout: 30000,
    env: { ...process.env, PATH: `${path.join(root, 'node_modules/.bin')}${path.delimiter}${process.env.PATH}`,
      NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_INTERACTIVE: 'false', FORCE_COLOR: '0' },
  });
});

test('Discovery: Angular workspace configuration and its leaf config', async () => {
  const workspace = path.join(root, 'tests/fixtures/angular-single');
  const { stdout } = await exec(process.execPath, [path.join(root, 'scripts/discover.mjs'), '--workspace', workspace]);
  const report = JSON.parse(stdout);
  assert.equal(report.backend, 'angular-json');
  assert.deepEqual(report.projects.map(p => p.name), ['single']);
  assert.equal(report.projects[0].configs[0].file, 'tsconfig.json');
  assert.equal(report.projects[0].configs[0].rootFileCount, 5);
});

test('Report output cannot follow a symlink into the scanned workspace', async () => {
  await mkdir(path.join(root, 'test-output'), { recursive: true });
  const temp = await mkdtemp(path.join(root, 'test-output/guard-'));
  const workspace = path.join(temp, 'workspace');
  await mkdir(workspace);
  const source = path.join(workspace, 'source.json');
  await writeFile(source, 'preserve me');
  await symlink(source, path.join(temp, 'output.json'));
  try {
    await assert.rejects(exec(process.execPath, [path.join(root, 'scripts/collect-references.mjs'),
      '--workspace', workspace, '--manifest', 'lookup.json', '--output', path.join(temp, 'output.json')]),
    error => /Write the report outside the scanned workspace/.test(error.stderr));
    assert.equal(await readFile(source, 'utf8'), 'preserve me');
  } finally { await rm(temp, { recursive: true, force: true }); }
});
