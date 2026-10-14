import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const output = path.join(root, 'test-output/material');
export const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const require = createRequire(import.meta.url);

// Official TypeScript exports resolve the package declaration independently of
// the catalog being qualified. No selector/name-to-class guessing is involved.
export function declarations() {
  const ts = require('typescript');
  const entrypoints = [...new Set(cases.map(c => c.entrypoint))];
  const pkg = require('@angular/material/package.json');
  const packageRoot = path.dirname(require.resolve('@angular/material/package.json'));
  const files = entrypoints.map(e => path.join(packageRoot, pkg.exports['./' + e.split('/')[2]].types));
  const program = ts.createProgram(files, { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext });
  const checker = program.getTypeChecker();
  return new Map(cases.map(item => {
    const sf = program.getSourceFile(files[entrypoints.indexOf(item.entrypoint)]);
    let symbol = checker.getExportsOfModule(checker.getSymbolAtLocation(sf)).find(s => s.name === item.symbol);
    if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    const declaration = symbol?.valueDeclaration;
    if (!declaration || !ts.isClassDeclaration(declaration)) throw new Error(`Missing class ${item.symbol}`);
    return [item.symbol, declaration.getSourceFile().fileName];
  }));
}

export async function generate(item, targetFile) {
  const workspace = path.join(output, 'workspaces', item.symbol);
  await rm(workspace, { recursive: true, force: true });
  await mkdir(workspace, { recursive: true });
  // The same selector in a comment and a plain string must not be an Angular use.
  const html = item.templates.join('\n');
  const additional = item.extraImport ? `import { ${item.extraImport.name} } from '${item.extraImport.entrypoint}';\n` : '';
  const types = item.typeImport ? `import type { ${item.typeImport.name} } from '${item.typeImport.entrypoint}';\n` : '';
  const imports = [item.symbol, item.extraImport?.name].filter(Boolean).join(', ');
  const source = `import { Component } from '@angular/core';
import { ${item.symbol} } from '${item.entrypoint}';
${additional}${types}// ${html.replaceAll('\n', '\n// ')}
const collateral = ${JSON.stringify(html)};
@Component({ selector: 'fixture-inline', imports: [${imports}], template: \`
${html}
@if (visible) { ${html} }
@for (entry of entries; track entry) { ${html} }
@defer { ${html} }
\` })
export class InlineConsumer { visible = true; entries = [1, 2]; ${item.fields ?? ''} }
@Component({ selector: 'fixture-external', imports: [${imports}], templateUrl: './unrelated-name.html' })
export class ExternalConsumer { ${item.fields ?? ''} }
`;
  const tsOnly = `import { ${item.symbol} } from '${item.entrypoint}';\nexport type Target = ${item.symbol}${item.typeArguments ?? ''};\n`;
  const files = { 'package.json': '{}', 'consumer.ts': item.templates.length ? source : tsOnly,
    'unrelated-name.html': html,
    'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
      experimentalDecorators: true, strict: true, skipLibCheck: true, noEmit: true },
    angularCompilerOptions: { strictTemplates: true }, files: ['consumer.ts'] }) };
  for (const [file, text] of Object.entries(files)) await writeFile(path.join(workspace, file), text);
  return { workspace, files, manifest: { target: { file: path.relative(workspace, targetFile), symbol: item.symbol },
    projects: [{ name: item.symbol, tsconfig: 'tsconfig.json', anchor: { file: 'consumer.ts' },
      ...(!item.templates.length && { backend: 'typescript' }), probes: [{ file: 'consumer.ts', text: item.symbol }] }] } };
}

export async function hashes(workspace, files) {
  return Object.fromEntries(await Promise.all(Object.keys(files).map(async file =>
    [file, createHash('sha256').update(await readFile(path.join(workspace, file))).digest('hex')])));
}
