import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { collect } from '../../scripts/collect-references.mjs';
import { generate } from './workspace.mjs';
import { investigateAliases, investigateFlows, investigateMembers, investigateNonBindable, investigateOpeners, investigateSourceEdges } from './followups.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(root, 'test-output/gauntlet');
const workspace = path.join(output, 'workspace');
const require = createRequire(import.meta.url), exec = promisify(execFile);
const key = r => `${r.file}:${JSON.stringify(r.range)}`;
const markerProbe = (file, id, token) => ({ file, text: `/*@use:dynamic:${id}*/${token}`, offset: `/*@use:dynamic:${id}*/`.length });

test('rendering gauntlet: exact static references and investigated indirect rendering', { timeout: 180000 }, async () => {
  await mkdir(output, { recursive: true });
  const fixture = await generate(workspace);
  const hashes = async () => Promise.all(fixture.files.map(async file => [file, createHash('sha256').update(await readFile(path.join(workspace, file))).digest('hex')]));
  const before = await hashes();
  // Written before ngc or reference collection; no backend-generated goldens.
  await writeFile(path.join(output, 'source-hashes.json'), JSON.stringify(before, null, 2));
  const compiler = path.resolve(path.dirname(require.resolve('@angular/compiler-cli/package.json')), require('@angular/compiler-cli/package.json').bin.ngc);
  const compiled = await exec(process.execPath, [compiler, '-p', path.join(workspace, 'tsconfig.json'), '--noEmit', 'false', '--outDir', path.join(output, 'compiled')], { timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  await writeFile(path.join(output, 'typecheck.log'), compiled.stdout + compiled.stderr);
  const probes = {
    card: { file: 'src/modern.html', owner: 'src/modern.ts', text: '<gauntlet-card data-case="at-if"', offset: 1 },
    legacy: { file: 'src/legacy.html', owner: 'src/legacy.ts', text: '<legacy-card data-case="module-card-if"', offset: 1 },
    dynamic: markerProbe('src/modern.ts', 'dialog-direct', 'DynamicCard'),
  };
  const summaries = [];
  const nonBindable = await investigateNonBindable(workspace, output);
  for (const target of ['card', 'legacy', 'dynamic']) {
    const manifest = { target: { file: 'src/cards.ts', symbol: fixture.symbols[target] }, projects: [{ name: 'gauntlet', tsconfig: 'tsconfig.json',
      ...(target === 'dynamic' && { backend: 'typescript' }), anchor: { file: 'src/modern.ts' }, probes: [probes[target]] }] };
    await writeFile(path.join(output, `${target}-manifest.json`), JSON.stringify(manifest, null, 2));
    const report = await collect(workspace, manifest);
    assert.equal(report.status, 'partial');
    await writeFile(path.join(output, `${target}.json`), JSON.stringify(report, null, 2));
    // Preserve first-pass evidence across subsequent investigation runs.
    await copyFile(path.join(output, `${target}.json`), path.join(output, `${target}-first-pass.json`), 1).catch(e => { if (e.code !== 'EEXIST') throw e; });
    const expected = fixture.expected.filter(r => r.target === target);
    const wanted = new Set(expected.map(key)), actual = new Set(report.references.map(key));
    const initialMissing = expected.filter(r => !actual.has(key(r)));
    const recovered = target === 'dynamic' ? await investigateAliases(workspace, output, fixture.expected) : [];
    recovered.forEach(r => actual.add(key(r)));
    const rejected = target === 'card' && actual.has(key(nonBindable)) ? [nonBindable] : [];
    rejected.forEach(r => actual.delete(key(r)));
    summaries.push({ target, status: report.collectionStatus, expected: expected.length, actual: actual.size,
      templateOccurrences: expected.filter(r => r.kind === 'template-occurrence').length,
      initialMissing: initialMissing.map(r => r.id), recovered: recovered.length,
      rejected, rawReferences: report.references.length,
      missing: expected.filter(r => !actual.has(key(r))), extras: report.references.filter(r => !wanted.has(key(r)) && !rejected.some(e => key(e) === key(r))),
      failures: report.coverage.filter(r => r.result !== 'verified'),
    });
    assert.ok(report.references.every(r => r.contexts.length === 1 && r.contexts[0].tsconfig === 'tsconfig.json'));
    for (const row of report.coverage) if (row.process) {
      assert.equal(row.process.exited, true);
      assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
    }
  }
  await writeFile(path.join(output, 'qualification.json'), JSON.stringify(summaries, null, 2));
  const flows = await investigateFlows(workspace, output);
  const members = await investigateMembers(workspace, output);
  const openers = await investigateOpeners(workspace, output);
  const sourceEdges = await investigateSourceEdges(workspace, output);
  await writeFile(path.join(output, 'summary.json'), JSON.stringify({ summaries, flows, members, openers, sourceEdges }, null, 2));
  assert.deepEqual(await hashes(), before, 'Collection must not modify fixture sources or configs');
  assert.ok(summaries.every(s => s.status === 'succeeded' && !s.missing.length && !s.extras.length), JSON.stringify(summaries, null, 2));
});
