import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { collect } from '../../scripts/collect-references.mjs';
import { generateMaterialCatalog } from '../../scripts/material-catalog.mjs';
import { cases, root, output, declarations, generate, hashes } from './workspace.mjs';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const key = r => `${r.file}:${r.range.start.line}:${r.range.start.column}-${r.range.end.line}:${r.range.end.column}`;

function expectedReferences(item, files) {
  const expected = [];
  const add = (file, source, offset, text, candidate) => {
    const prefix = source.slice(0, offset).split('\n');
    const start = { line: prefix.length, column: prefix.at(-1).length + 1 };
    expected.push({ file, range: { start, end: { line: start.line, column: start.column + text.length } }, candidate });
  };
  for (const [file, source] of Object.entries(files).filter(([file]) => /\.(ts|html)$/.test(file))) {
    if (file.endsWith('.ts')) {
      // Import, standalone dependencies, or the abstract type use. Exclude
      // comments and plain strings even when they contain the same spelling.
      let offset = 0;
      for (const line of source.split('\n')) {
        if (/^(import |@Component|export type )/.test(line)) {
          for (const match of line.matchAll(new RegExp(`\\b${item.symbol}\\b`, 'g'))) add(file, source, offset + match.index, item.symbol);
        }
        offset += line.length + 1;
      }
    }
    const start = file.endsWith('.ts') ? source.indexOf('template: `') : 0;
    if (start < 0) continue;
    for (const [index, template] of item.templates.entries()) {
      const tag = template.slice(0, template.indexOf('>') + 1);
      const token = item.candidateTokens?.[index] ?? item.selectors[index].match(/\[([^\]=]+)/)?.[1] ?? item.selectors[index];
      const delta = tag.indexOf(token);
      assert.ok(delta >= 0, `${item.symbol}: selector token must exist in fixture`);
      let offset = -1, occurrence = -1;
      while ((offset = source.indexOf(tag, offset + 1)) >= 0) {
        occurrence++;
        if (offset >= start) add(file, source, offset, tag, { file, text: tag, offset: delta, occurrence,
          ...(file.endsWith('.html') && { owner: 'consumer.ts' }) });
      }
    }
  }
  return expected;
}

test('frozen consumer matrix accounts for every public Material component and directive', async () => {
  const catalog = await generateMaterialCatalog(root);
  const actual = Object.values(catalog.entities).filter(e => ['component', 'directive'].includes(e.kind) && e.exports.some(x => x.role === 'runtime'));
  assert.deepEqual(cases.map(c => c.symbol).sort(), actual.map(e => e.name).sort());
  for (const item of cases) {
    const entity = actual.find(e => e.name === item.symbol);
    assert.deepEqual(item.selectors, entity.angular.selectors.map(s => s.text), item.symbol);
    assert.equal(item.templates.length, item.selectors.length, item.symbol);
    if (!item.templates.length) assert.ok(item.reason, 'Non-template targets need an explicit reason');
  }
});

const results = [];
let targets;
const compiler = path.resolve(path.dirname(require.resolve('@angular/compiler-cli/package.json')), require('@angular/compiler-cli/package.json').bin.ngc);
before(async () => {
  await mkdir(output, { recursive: true });
  targets = declarations();
  await writeFile(path.join(output, 'summary.json'), '[]\n');
});
after(async () => {
  await writeFile(path.join(output, 'run.json'), JSON.stringify({ expectedTargets: cases.length,
    completedTargets: results.length, scope: results.length === cases.length ? 'all-cases' : 'filtered',
    passed: results.filter(r => r.status === 'passed').length, failed: results.filter(r => r.status === 'failed').length,
    node: process.version, angular: require('@angular/core/package.json').version,
    material: require('@angular/material/package.json').version }, null, 2));
});

for (const item of cases) test(`Material ${item.symbol}`, { timeout: 120000 }, async () => {
  const result = { symbol: item.symbol, status: 'running' };
  results.push(result);
  try {
    const { workspace, files, manifest } = await generate(item, targets.get(item.symbol));
    await rm(path.join(output, `${item.symbol}.candidates.json`), { force: true });
    await rm(path.join(output, `${item.symbol}.compiler.json`), { force: true });
    const before = await hashes(workspace, files);
    const oracle = expectedReferences(item, files);
    const started = performance.now();
    await exec(process.execPath, [compiler, '-p', path.join(workspace, 'tsconfig.json'), '--noEmit'], { timeout: 60000 });
    const report = await collect(workspace, manifest);
    await writeFile(path.join(output, `${item.symbol}.json`), JSON.stringify(report, null, 2));
    assert.deepEqual(await hashes(workspace, files), before, 'Lookup must not change source/config files');
    for (const row of report.coverage) if (row.process) {
      assert.equal(row.process.exited, true);
      assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
    }
    assert.equal(report.collectionStatus, 'succeeded', JSON.stringify(report.coverage.map(r => r.error)));
    const expected = oracle.map(key).sort();
    const actual = report.references.filter(r => Object.hasOwn(files, r.file)).map(key).sort();
    const rawMissing = expected.filter(k => !actual.includes(k));
    const extra = actual.filter(k => !expected.includes(k));
    // Reconcile omissions through the shipped explicit-candidate workflow.
    // Never remove a raw miss, change its expected location, or fabricate a
    // reference range from a definition. Report both evidence kinds separately.
    const candidates = oracle.filter(ref => ref.candidate && rawMissing.includes(key(ref)));
    const recovered = [], compilerRecovered = [];
    async function reconcile(plannedCandidates, backend) {
      if (!plannedCandidates.length) return;
      const followup = structuredClone(manifest);
      followup.projects[0].candidates = plannedCandidates.map(ref => ({ ...ref.candidate, ...(backend && { backend }) }));
      const reconciled = await collect(workspace, followup);
      await writeFile(path.join(output, `${item.symbol}.${backend ? 'compiler' : 'candidates'}.json`), JSON.stringify(reconciled, null, 2));
      assert.equal(reconciled.collectionStatus, 'succeeded');
      assert.deepEqual(await hashes(workspace, files), before, 'Candidate verification must remain read-only');
      assert.deepEqual(reconciled.references, report.references, 'Candidate verification must preserve raw reference evidence');
      for (const row of reconciled.coverage) if (row.process) {
        assert.equal(row.process.exited, true);
        assert.throws(() => process.kill(row.process.pid, 0), { code: 'ESRCH' });
      }
      assert.equal(reconciled.candidateEvidence.length, plannedCandidates.length);
      for (const [index, candidate] of reconciled.candidateEvidence.entries()) {
        const planned = plannedCandidates[index];
        const position = { line: planned.range.start.line - 1, character: planned.range.start.column - 1 + planned.candidate.offset };
        assert.deepEqual(candidate.request, { textDocument: { uri: pathToFileURL(path.join(workspace, planned.file)).href }, position });
        assert.equal(candidate.fileHash, before[planned.file]);
        assert.equal(candidate.project, item.symbol);
        assert.equal(candidate.tsconfig, 'tsconfig.json');
        if (candidate.status === 'confirmed') {
          recovered.push(key(planned));
          if (backend) compilerRecovered.push(key(planned));
        }
      }
    }
    await reconcile(candidates);
    await reconcile(candidates.filter(ref => !recovered.includes(key(ref))), 'angular-compiler');
    const missing = rawMissing.filter(k => !recovered.includes(k));
    const row = { symbol: item.symbol, selectors: item.selectors.length, expectedTemplates: item.templates.length * 5, rawMissing, recovered, compilerRecovered, missing, extra,
      seconds: (performance.now() - started) / 1000, referenceCount: report.references.length };
    Object.assign(result, row);
    assert.deepEqual(extra, [], 'No unexpected consumer references, including comments and string literals');
    assert.deepEqual(missing, [], `${item.symbol}: template omissions`);
    assert.deepEqual([...actual, ...recovered].sort(), expected, 'Every expected occurrence has reference or separate definition evidence');
    for (const ref of report.references.filter(r => Object.hasOwn(files, r.file))) {
      assert.deepEqual(ref.contexts, [{ project: item.symbol, tsconfig: 'tsconfig.json' }]);
    }
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    throw error;
  } finally {
    await writeFile(path.join(output, 'summary.json'), JSON.stringify(results, null, 2));
  }

});
