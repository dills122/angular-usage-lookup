import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { generate, hashes, root, output, workspace } from './workspace.mjs';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const env = { ...process.env, PATH: `${root}/node_modules/.bin${path.delimiter}${process.env.PATH}`,
  NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_INTERACTIVE: 'false', FORCE_COLOR: '0' };
const json = async file => JSON.parse(await readFile(path.join(output, file), 'utf8'));
const key = ref => `${ref.file}:${JSON.stringify(ref.range)}`;

export function compare(actual, expected) {
  const wanted = new Map(expected.map(ref => [key(ref), ref]));
  const got = new Map(actual.map(ref => [key(ref), ref]));
  const missing = [...wanted.keys()].filter(k => !got.has(k));
  const extra = [...got.keys()].filter(k => !wanted.has(k));
  const contextErrors = [...wanted].flatMap(([k, ref]) => {
    const expectedContexts = ref.contexts;
    const actualContexts = (got.get(k)?.contexts ?? []).map(c => c.tsconfig).sort();
    return JSON.stringify(expectedContexts) === JSON.stringify(actualContexts) ? [] : [{ location: k, expectedContexts, actualContexts }];
  });
  const categories = Object.fromEntries([...new Set(expected.map(r => r.category))].map(category => {
    const refs = expected.filter(r => r.category === category);
    return [category, { expected: refs.length, found: refs.filter(r => got.has(key(r))).length }];
  }));
  return { expected: wanted.size, actual: got.size, truePositives: wanted.size - missing.length,
    precision: got.size ? (got.size - extra.length) / got.size : null, recall: wanted.size ? (wanted.size - missing.length) / wanted.size : null,
    expectedContextPairs: expected.reduce((n, r) => n + r.contexts.length, 0),
    actualContextPairs: actual.reduce((n, r) => n + r.contexts.length, 0), missing, extra, contextErrors, categories };
}

test('54 Angular libraries, three apps: exact locations and config ownership at scale', { timeout: 900000 }, async t => {
  const oracle = await generate();
  const before = await hashes();
  const metrics = { generatedAt: new Date().toISOString(), node: process.version, platform: process.platform,
    blueprint: oracle.blueprint, sourceAndConfigFiles: Object.keys(before).length, commands: {}, targets: {} };
  await writeFile(path.join(output, 'metrics.json'), JSON.stringify(metrics, null, 2));
  const run = async (name, args, cwd = root, timeout = 360000) => {
    t.diagnostic(`Starting ${name}`);
    const start = performance.now();
    let result;
    try { result = await exec(process.execPath, args, { cwd, env, timeout, maxBuffer: 20 * 1024 * 1024 }); }
    catch (error) { result = error; }
    metrics.commands[name] = { seconds: (performance.now() - start) / 1000, exitCode: result.code ?? 0 };
    await writeFile(path.join(output, `${name}.stdout`), result.stdout ?? '');
    await writeFile(path.join(output, `${name}.stderr`), result.stderr ?? '');
    await writeFile(path.join(output, 'metrics.json'), JSON.stringify(metrics, null, 2));
    return result;
  };
  const discovery = await run('discovery', [path.join(root, 'scripts/discover.mjs'), '--workspace', workspace]);
  assert.equal(discovery.code ?? 0, 0, discovery.stderr);
  const inventory = JSON.parse(discovery.stdout);
  assert.equal(inventory.projects.length, 57);
  assert.equal(inventory.projects.filter(p => p.root.startsWith('libs/')).length, 54);
  assert.equal(inventory.projects.flatMap(p => p.configs).filter(c => c.rootFileCount > 0).length, 63);
  const nx = path.resolve(path.dirname(require.resolve('nx/package.json')), require('nx/package.json').bin.nx);
  const compilation = await run('typecheck', [nx, 'run-many', '-t', 'typecheck,typecheck-spec,typecheck-story', '--all', '--parallel=2', '--skip-nx-cache'], workspace);
  assert.equal(compilation.code ?? 0, 0, compilation.stdout + compilation.stderr);
  for (const target of ['card', 'dialog']) {
    const reportFile = path.join(output, `${target}.json`);
    const collected = await run(`lookup-${target}`, [path.join(root, 'scripts/collect-references.mjs'), '--workspace', workspace,
      '--manifest', `lookup-${target}.json`, '--output', reportFile]);
    const report = await json(`${target}.json`);
    const result = compare(report.references, oracle.targets[target]);
    metrics.targets[target] = { ...result, reportBytes: (await stat(reportFile)).size,
      verifiedConfigs: report.coverage.filter(c => c.result === 'verified').length, configs: report.coverage.length,
      failedConfigs: report.coverage.filter(c => c.result !== 'verified').map(c => ({ project: c.project, tsconfig: c.tsconfig, error: c.error })),
      angularProcesses: report.coverage.filter(c => c.process).length,
      allAngularProcessesExited: report.coverage.every(c => !c.process || c.process.exited) };
    for (const row of report.coverage) if (row.process) assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
    await writeFile(path.join(output, 'metrics.json'), JSON.stringify(metrics, null, 2));
    // Record both targets before asserting accuracy, so one miss cannot obscure
    // the other target or change the pre-frozen oracle.
    t.diagnostic(`${target}: ${collected.code ?? 0}; ${result.truePositives}/${result.expected} locations, ${result.extra.length} extra, ${result.contextErrors.length} context mismatches`);
  }
  assert.deepEqual(await hashes(), before, 'Analysis does not modify workspace sources/configs');
  for (const [target, result] of Object.entries(metrics.targets)) {
    assert.deepEqual(result.failedConfigs, [], `${target}: failed configs`);
    assert.deepEqual(result.extra, [], `${target}: false positives`);
    assert.deepEqual(result.missing, [], `${target}: omissions`);
    assert.deepEqual(result.contextErrors, [], `${target}: wrong config membership`);
  }
});
