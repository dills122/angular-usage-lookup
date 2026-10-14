import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collect } from '../scripts/collect-references.mjs';

const workspace = fileURLToPath(new URL('./fixtures/api-shapes/', import.meta.url));
const output = fileURLToPath(new URL('../test-output/api-shapes/', import.meta.url));
const require = createRequire(import.meta.url);
const exec = promisify(execFile);

// Frozen positive tokens and negative selector case; token inclusion is used
// here because LS class references have different span widths by Angular kind.
const cases = [
  { symbol: 'FancyDirective', probe: 'fancy', uses: ['fancy', 'cool></button>', 'wrapped [power]'] },
  { symbol: 'WrappedDirective', probe: 'wrapped', uses: ['wrapped [power]'] },
  { symbol: 'FormatPipe', member: 'transform', probe: 'format}}', uses: ['format}}'] },
  { symbol: 'ButtonComponent', probe: 'superButton', uses: ['superButton fancy', 'superButton></a>'] },
  { symbol: 'FancyDirective', member: 'strength', probe: 'glow]', uses: ['glow]', 'power]'] },
  { symbol: 'FancyDirective', member: 'changed', probe: 'glowed)', uses: ['glowed)', 'powered)'] },
];
test('API-shape qualification: attribute/compound selectors, pipe and host composition', async () => {
  const compiler = path.resolve(path.dirname(require.resolve('@angular/compiler-cli/package.json')), require('@angular/compiler-cli/package.json').bin.ngc);
  await exec(process.execPath, [compiler, '-p', path.join(workspace, 'tsconfig.json'), '--noEmit']);
  await mkdir(output, { recursive: true });
  const source = await readFile(path.join(workspace, 'src/consumer.ts'), 'utf8');
  const results = [];
  for (const item of cases) {
    const manifest = { target: { file: 'src/types.ts', symbol: item.symbol, ...(item.member && { member: item.member }) }, projects: [{ name: 'api-shapes', tsconfig: 'tsconfig.json',
      anchor: { file: 'src/consumer.ts' }, probes: [{ file: 'src/consumer.ts', text: item.probe }] }] };
    const report = await collect(workspace, manifest);
    await writeFile(path.join(output, `${item.symbol}${item.member ? '.' + item.member : ''}.json`), JSON.stringify(report, null, 2));
    const contains = (ref, token) => {
      const before = source.slice(0, source.indexOf(token)).split('\n');
      const pos = { line: before.length, column: before.at(-1).length + 1 };
      return ref.file === 'src/consumer.ts' && ref.range.start.line === pos.line && ref.range.start.column <= pos.column && ref.range.end.column > pos.column;
    };
    const missing = item.uses.filter(token => !report.references.some(r => contains(r, token)));
    const falsePositive = report.references.some(r => contains(r, 'cool disabled'));
    results.push({ symbol: item.symbol, member: item.member, collectionStatus: report.collectionStatus, expectedTemplateUses: item.uses.length, missing, falsePositive });
  }
  await writeFile(path.join(output, 'qualification.json'), JSON.stringify(results, null, 2));
  assert.ok(results.every(r => r.collectionStatus === 'succeeded' && !r.falsePositive), JSON.stringify(results));
  // Host composition is deliberately included in the denominator. Any missing
  // inherited directive application must be investigated, not removed to pass.
  assert.deepEqual(results.flatMap(r => r.missing.map(token => ({ symbol: r.symbol, token }))), []);
});

test('an unresolved member cannot silently fall back to a class-wide lookup', async () => {
  await assert.rejects(collect(workspace, { target: { file: 'src/types.ts', symbol: 'FancyDirective', member: 'missing' }, projects: [] }), /Member target must resolve/);
});
