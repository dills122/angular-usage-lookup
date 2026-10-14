import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { generate, logicalInventory } from './workspace.mjs';
import { compilerCandidates } from '../../scripts/compiler-candidates.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url)), output = path.join(root, 'test-output/blind-transformations');
const require = createRequire(import.meta.url), ts = require('typescript'), exec = promisify(execFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function declarations() {
  const pkg = require('@angular/material/package.json'), packageRoot = path.dirname(require.resolve('@angular/material/package.json'));
  const files = ['core', 'tree'].map(entry => path.join(packageRoot, pkg.exports[`./${entry}`].types));
  const program = ts.createProgram(files, { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext });
  const checker = program.getTypeChecker(), result = {};
  for (const [i, name] of ['MatOption', 'MatTreeNodePadding'].entries()) {
    const file = program.getSourceFile(files[i]);
    let symbol = checker.getExportsOfModule(checker.getSymbolAtLocation(file)).find(s => s.name === name);
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol.valueDeclaration;
    result[i ? 'padding' : 'option'] = { file: declaration.getSourceFile().fileName, offset: declaration.name.getStart() };
  }
  return result;
}

test('paired transformations preserve all authored Angular associations and config memberships', { timeout: 240000 }, async () => {
  await mkdir(output, { recursive: true });
  const native = declarations(), results = [];
  for (const variant of ['baseline', 'transformed']) {
    const workspace = path.join(output, variant);
    await rm(workspace, { recursive: true, force: true });
    const oracle = await generate(workspace, variant);
    const before = Object.fromEntries(await Promise.all(oracle.files.map(async f => [f, hash(await readFile(path.join(workspace, f)))])));
    await writeFile(path.join(output, `${variant}.oracle.json`), JSON.stringify(oracle, null, 2));
    const nx = path.resolve(path.dirname(require.resolve('nx/package.json')), require('nx/package.json').bin.nx);
    const env = { ...process.env, PATH: `${root}/node_modules/.bin${path.delimiter}${process.env.PATH}`, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_INTERACTIVE: 'false' };
    const compiled = await exec(process.execPath, [nx, 'run-many', '-t', 'check-lib,check-app,check-spec,check-story', '--all', '--parallel=2', '--skip-nx-cache'], { cwd: workspace, env, timeout: 90000 });
    await writeFile(path.join(output, `${variant}.compile.log`), compiled.stdout + compiled.stderr);
    const discovered = await exec(process.execPath, [path.join(root, 'scripts/discover.mjs'), '--workspace', workspace], { env, timeout: 60000 });
    const inventory = JSON.parse(discovered.stdout);
    assert.deepEqual(inventory.projects.flatMap(p => p.configs).filter(c => c.rootFileCount > 0).map(c => c.file).sort(), oracle.configs.map(c => c.file).sort());
    const declarationFile = path.join(workspace, oracle.targets.card.file), declarationText = await readFile(declarationFile, 'utf8');
    const ast = ts.createSourceFile(declarationFile, declarationText, ts.ScriptTarget.Latest, true);
    const declaration = ast.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === oracle.targets.card.symbol);
    const targets = { ...native, card: { file: declarationFile, offset: declaration.name.getStart(ast) } };
    const verified = [];
    for (const config of oracle.configs) {
      const sites = oracle.occurrences.filter(r => r.contexts.includes(config.file));
      if (!sites.length) continue;
      const query = await compilerCandidates(workspace, path.join(workspace, config.file));
      for (const site of sites) {
        const owner = site.file.endsWith('.html') ? site.file.replace('views/moved screen.html', 'panels/site.ts') : site.file;
        const target = targets[site.target];
        const evidence = query(path.join(workspace, owner), { textDocument: { uri: pathToFileURL(path.join(workspace, site.file)).href },
          position: { line: site.range.start.line - 1, character: site.range.start.column } }, target.file, target.offset);
        assert.equal(evidence.resolvesToTarget, true, `${variant}: ${site.id} / ${config.role}`);
        verified.push({ id: site.id, context: config.role, evidence });
      }
    }
    for (const [file, digest] of Object.entries(before)) assert.equal(hash(await readFile(path.join(workspace, file))), digest);
    await writeFile(path.join(output, `${variant}.evidence.json`), JSON.stringify(verified, null, 2));
    results.push({ variant, logical: logicalInventory(oracle), pairs: verified.map(r => [r.id, r.context]).sort(), locations: oracle.occurrences.length });
  }
  assert.deepEqual(results[0].logical, results[1].logical);
  assert.deepEqual(results[0].pairs, results[1].pairs);
  await writeFile(path.join(output, 'summary.json'), JSON.stringify(results.map(({ logical, ...result }) => result), null, 2));
});
