import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { startTypeScript } from '../scripts/typescript.mjs';

const ts = createRequire(import.meta.url)('typescript');

for (const caseSensitive of [true, false]) {
  test(`TypeScript adapter resolves exact references with case-sensitive host = ${caseSensitive}`, async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), 'angular-usage-ts-host-'));
    let client;
    try {
      const target = path.join(workspace, 'target.ts');
      const consumer = path.join(workspace, 'consumer.ts');
      await writeFile(target, 'export class TargetComponent {}\n');
      await writeFile(consumer, 'import { TargetComponent } from "./target";\nexport const dialogComponent = TargetComponent;\n');
      // Exercise both System boolean values without changing TypeScript's global sys.
      const adapterTs = { ...ts, sys: { ...ts.sys, useCaseSensitiveFileNames: caseSensitive } };
      client = startTypeScript(adapterTs, workspace, {
        options: { noLib: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10 },
        fileNames: [target, consumer],
      });
      const location = (file, line, start, end) => ({ uri: pathToFileURL(file).href, range: { start: { line, character: start }, end: { line, character: end } } });
      const query = (file, line, character) => ({ textDocument: { uri: pathToFileURL(file).href }, position: { line, character } });
      assert.deepEqual(client.definition(query(consumer, 1, 31)).locations, [location(target, 0, 13, 28)]);
      const key = value => JSON.stringify(value);
      assert.deepEqual(client.references([query(target, 0, 13)]).locations.map(key).sort(), [
        location(target, 0, 13, 28), location(consumer, 0, 9, 24), location(consumer, 1, 31, 46),
      ].map(key).sort());
    } finally {
      client?.dispose();
      await rm(workspace, { recursive: true, force: true });
    }
  });
}
