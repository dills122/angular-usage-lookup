import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// This adapter asks Angular for directive associations. It does not implement
// selector matching, infer template ownership, emit code, or invent references.
export async function compilerCandidates(workspace, configFile) {
  const require = createRequire(path.join(workspace, 'package.json'));
  const core = require('@angular/core/package.json').version;
  for (const name of ['@angular/compiler', '@angular/compiler-cli']) {
    const version = require(`${name}/package.json`).version;
    if (version !== core || version !== '21.2.25') throw new Error(`Compiler candidate backend requires qualified Angular 21.2.25; ${name} resolves ${version}`);
  }
  const ts = require('typescript');
  const { NgtscProgram, readConfiguration, createCompilerHost } = await import(pathToFileURL(require.resolve('@angular/compiler-cli')).href);
  const { TmplAstRecursiveVisitor, tmplAstVisitAll } = await import(pathToFileURL(require.resolve('@angular/compiler')).href);
  const { rootNames, options, errors } = readConfiguration(configFile);
  if (errors.length) throw new Error('Angular compiler configuration has diagnostics');
  // Version-specific internal enablement; all semantic work uses Angular's TTC.
  options._enableTemplateTypeChecker = true;
  const program = new NgtscProgram(rootNames, options, createCompilerHost({ options }));
  await program.loadNgStructureAsync();
  const configEvidence = { backend: 'angular-compiler', configFile,
    configHash: createHash('sha256').update(await readFile(configFile)).digest('hex'),
    rootFiles: rootNames, programFiles: program.getTsProgram().getSourceFiles().map(source => source.fileName) };
  const checker = program.compiler.getTemplateTypeChecker();
  const owners = new Map();
  const span = value => ({ file: value.start.file.url, start: { offset: value.start.offset, line: value.start.line, character: value.start.col },
    end: { offset: value.end.offset, line: value.end.line, character: value.end.col } });
  return (owner, request, targetFile, targetOffset) => {
    let entries = owners.get(owner);
    if (!entries) {
      entries = [];
      const source = program.getTsProgram().getSourceFile(owner);
      if (!source) throw new Error('Compiler candidate owner is absent from its program');
      for (const component of source.statements.filter(ts.isClassDeclaration)) {
        const template = checker.getTemplate(component);
        if (!template) continue;
        class Visitor extends TmplAstRecursiveVisitor {
          record(node) {
            const sourceSpan = node.startSourceSpan ?? node.sourceSpan;
            if (sourceSpan) entries.push({ component, node, sourceSpan });
          }
          visitElement(node) { this.record(node); super.visitElement(node); }
          visitTemplate(node) { this.record(node); super.visitTemplate(node); }
        }
        tmplAstVisitAll(new Visitor(), template);
      }
      owners.set(owner, entries);
    }
    const file = fileURLToPath(request.textDocument.uri);
    const point = request.position;
    const matches = entries.filter(({ sourceSpan: s }) => {
      const url = s.start.file.url;
      const sourceFile = url.startsWith('file:') ? fileURLToPath(url) : path.resolve(workspace, url);
      return sourceFile === file &&
        (s.start.line < point.line || (s.start.line === point.line && s.start.col <= point.character)) &&
        (s.end.line > point.line || (s.end.line === point.line && s.end.col > point.character));
    });
    if (matches.length !== 1) throw new Error(`Compiler candidate requires one native template node; found ${matches.length}`);
    const { component, node, sourceSpan } = matches[0];
    const symbol = checker.getSymbolOfNode(node, component);
    if (!Array.isArray(symbol?.directives)) throw new Error('Compiler returned no directive association evidence');
    const directives = symbol.directives.map(d => ({ ref: d.ref, matchSource: d.matchSource, selector: d.selector,
      isComponent: d.isComponent, isInScope: d.isInScope }));
    return { version: core, owner, configEvidence, component: component.name?.text, sourceSpan: span(sourceSpan), directives,
      resolvesToTarget: directives.some(d => d.matchSource === 0 && d.ref.filePath === targetFile && d.ref.position === targetOffset) };
  };
}
