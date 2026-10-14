import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = path.join(root, 'tests/fixtures/nx-stress');
const output = path.join(root, 'test-output');
const projects = ['admin', 'dialogs', 'legacy', 'modern', 'reporting', 'shared', 'storefront', 'ui'];
const environment = { ...process.env, PATH: `${path.join(root, 'node_modules/.bin')}${path.delimiter}${process.env.PATH}`,
  NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_INTERACTIVE: 'false', FORCE_COLOR: '0' };

async function sourceHashes() {
  const files = (await readdir(workspace, { recursive: true })).filter(f => /\.(ts|html|json)$/.test(f) && !f.startsWith('.nx/')).sort();
  return Promise.all(files.map(async f => [f, createHash('sha256').update(await readFile(path.join(workspace, f))).digest('hex')]));
}

async function expectedReferences(file) {
  const expected = typeof file === 'string' ? JSON.parse(await readFile(path.join(workspace, file), 'utf8')) : file;
  const references = [];
  for (const ref of expected.references) {
    const source = await readFile(path.join(workspace, ref.file), 'utf8');
    const escaped = ref.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(ref.wholeWord ? `\\b${escaped}\\b` : escaped, 'g');
    const match = [...source.matchAll(pattern)][ref.occurrence];
    assert.ok(match, `Independent expectation must exist: ${JSON.stringify(ref)}`);
    const coordinate = offset => { const lines = source.slice(0, offset).split('\n'); return { line: lines.length, column: lines.at(-1).length + 1 }; };
    references.push({ file: ref.file, range: { start: coordinate(match.index), end: coordinate(match.index + ref.text.length) },
      contexts: [...(ref.contexts ?? [])].sort() });
  }
  return { ...expected, references };
}

const locationKey = ref => `${ref.file}:${JSON.stringify(ref.range)}`;

test('Stress fixture: Nx discovers six libraries/two apps and all eight Angular configs compile', { timeout: 120000 }, async () => {
  const { stdout } = await exec(process.execPath, [path.join(root, 'scripts/discover.mjs'), '--workspace', workspace], { timeout: 60000 });
  const discovery = JSON.parse(stdout);
  assert.deepEqual(discovery.projects.map(p => p.name).sort(), projects);
  assert.equal(discovery.projects.filter(p => p.root.startsWith('libs/')).length, 6);
  assert.ok(discovery.projects.every(p => p.configs.filter(c => c.rootFileCount > 0 && c.errors.length === 0).length === 1));
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'nx-stress-discovery.json'), stdout);
  const require = createRequire(import.meta.url);
  const nx = path.resolve(path.dirname(require.resolve('nx/package.json')), require('nx/package.json').bin.nx);
  const run = await exec(process.execPath, [nx, 'run-many', '-t', 'typecheck', `--projects=${projects.join(',')}`, '--parallel=2', '--skip-nx-cache'],
    { cwd: workspace, env: environment, timeout: 90000, maxBuffer: 4 * 1024 * 1024 });
  await writeFile(path.join(output, 'nx-stress-typecheck.txt'), run.stdout + run.stderr);
});

async function verifyLookup(target) {
  const before = await sourceHashes();
  const expected = await expectedReferences(`expected-${target}.json`);
  const manifest = JSON.parse(await readFile(path.join(workspace, `lookup-${target}.json`), 'utf8'));
  await mkdir(output, { recursive: true });
  const reportFile = path.join(output, `nx-stress-${target}.json`);
  try {
    await exec(process.execPath, [path.join(root, 'scripts/collect-references.mjs'), '--workspace', workspace,
      '--manifest', `lookup-${target}.json`, '--output', reportFile], { cwd: root, timeout: 180000, maxBuffer: 2 * 1024 * 1024 });
  } catch (error) { if (error.code !== 2) throw error; }
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.coverage.map(c => ({ project: c.project, error: c.error }))));
  assert.equal(report.status, 'partial');
  assert.deepEqual(report.coverage.map(c => c.project).sort(), manifest.projects.map(p => p.name).sort());
  assert.ok(report.coverage.every(c => c.result === 'verified' && c.probes.every(p => p.resolvesToTarget)));
  if (target === 'dialog') {
    assert.ok(report.coverage.every(c => c.backend === 'typescript' && c.capabilities.length === 1 && c.capabilities[0] === 'typescript-references'));
    assert.equal(report.gaps.filter(g => g.code === 'templates-not-analyzed').length, manifest.projects.length);
    assert.deepEqual(report.scope.exclusions, manifest.exclusions);
    assert.ok(report.coverage.find(c => c.project === 'legacy').probes[0].definitionChain.length > 1, 'Lazy import probe preserves the barrel definition hop');
  }
  assert.deepEqual(report.references.map(locationKey).sort(), expected.references.map(locationKey).sort(), 'Exact semantic reference spans; do not drop missing usages from the oracle');
  const actual = new Map(report.references.map(ref => [locationKey(ref), ref]));
  for (const ref of expected.references) {
    assert.deepEqual(actual.get(locationKey(ref)).contexts.map(c => c.project).sort(), ref.contexts, `Project contexts for ${locationKey(ref)}`);
  }
  assert.ok(report.references.every(r => !expected.forbiddenFiles.includes(r.file)));
  for (const row of report.coverage) if (row.process) {
    assert.equal(row.process.exited, true);
    assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
  }
  assert.deepEqual(await sourceHashes(), before, 'Collection does not alter fixture sources/configs');
}

test('Stress card lookup: legacy structural syntax, mixed scopes and shared library identity', { timeout: 190000 }, async () => {
  await verifyLookup('card');
});

test('Stress dialog lookup: no invented template usage; real MatDialog calls and aliases', { timeout: 190000 }, async () => {
  await verifyLookup('dialog');
});

test('TypeScript qualification rejects an unrelated dialog and an absent target program', async () => {
  const { collect } = await import('../scripts/collect-references.mjs');
  const manifest = JSON.parse(await readFile(path.join(workspace, 'lookup-dialog.json'), 'utf8'));
  const admin = manifest.projects.find(p => p.name === 'admin');
  admin.probes = [{ file: 'apps/admin/src/unrelated.ts', text: 'CoolDialogComponent' }];
  manifest.projects = [admin, { name: 'ui', tsconfig: 'libs/ui/tsconfig.lib.json', backend: 'typescript',
    anchor: { file: 'libs/ui/src/demo.ts' }, probes: [{ file: 'libs/ui/src/demo.ts', text: 'UiModule' }] }];
  const result = await collect(workspace, manifest);
  assert.equal(result.collectionStatus, 'failed');
  assert.equal(result.references.length, 0);
  assert.equal(result.coverage[0].probes[0].resolvesToTarget, false);
  assert.match(result.coverage[1].error, /not in the declared TypeScript program/);
});

test('Skill follow-up: existing TypeScript references expose alias/property/method callers for dialog tracing', async () => {
  const { startTypeScript } = await import('../scripts/typescript.mjs');
  const ts = createRequire(import.meta.url)('typescript');
  const clients = new Map();
  const expected = JSON.parse(await readFile(path.join(workspace, 'expected-flows.json'), 'utf8'));
  const evidence = [];
  try {
    for (const entry of expected.queries) {
      if (!clients.has(entry.tsconfig)) {
        const parsed = ts.getParsedCommandLineOfConfigFile(path.join(workspace, entry.tsconfig), {}, { ...ts.sys,
          onUnRecoverableConfigFileDiagnostic: d => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); } });
        clients.set(entry.tsconfig, startTypeScript(ts, workspace, parsed));
      }
      const client = clients.get(entry.tsconfig);
      const file = path.join(workspace, entry.file);
      const source = await readFile(file, 'utf8');
      const offset = source.indexOf(entry.text);
      assert.ok(offset >= 0);
      const lines = source.slice(0, offset).split('\n');
      const result = client.references([{ textDocument: { uri: pathToFileURL(file).href }, position: { line: lines.length - 1, character: lines.at(-1).length } }]);
      const wanted = await expectedReferences({ references: entry.references });
      const actual = result.locations.map(loc => ({ file: path.relative(workspace, fileURLToPath(loc.uri)), range: {
        start: { line: loc.range.start.line + 1, column: loc.range.start.character + 1 },
        end: { line: loc.range.end.line + 1, column: loc.range.end.character + 1 },
      } }));
      assert.deepEqual(actual.map(locationKey).sort(), wanted.references.map(locationKey).sort(), entry.text);
      evidence.push({ name: entry.text, tsconfig: entry.tsconfig, ...result });
    }
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, 'nx-stress-flows.json'), JSON.stringify(evidence, null, 2));
  } finally { for (const client of clients.values()) client.dispose(); }
});
