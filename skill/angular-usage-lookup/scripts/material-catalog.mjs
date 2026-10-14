#!/usr/bin/env node
// Serialization glue: Angular reads Ivy declarations/selectors; TypeScript resolves exports/types.
import { readFileSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import path from 'node:path';

const profileFile = new URL('../references/material-profile.json', import.meta.url);
const hash = text => createHash('sha256').update(text).digest('hex');
const ordered = values => [...new Set(values)].sort();
const familyOf = entrypoint => entrypoint.split('/')[2] ?? 'material';

export async function generateMaterialCatalog(workspace) {
  const require = createRequire(path.resolve(workspace, 'package.json'));
  const profileText = readFileSync(profileFile, 'utf8');
  const profile = JSON.parse(profileText);
  const versions = {}, packages = {};
  for (const [name, qualified] of Object.entries(profile.versions)) {
    const file = require.resolve(`${name}/package.json`);
    const text = readFileSync(file, 'utf8');
    const pkg = JSON.parse(text);
    if (pkg.version !== qualified) throw new Error(`Unqualified ${name} version ${pkg.version}; expected ${qualified}. Requalify before changing the profile.`);
    versions[name] = pkg.version;
    packages[name] = { file, text, pkg };
  }
  const ts = require('typescript');
  const { DtsMetadataReader, TypeScriptReflectionHost, Reference } = await import(pathToFileURL(require.resolve('@angular/compiler-cli/private/migrations')));
  const { CssSelector } = await import(pathToFileURL(require.resolve('@angular/compiler')));
  const material = packages['@angular/material'];
  const entries = Object.entries(material.pkg.exports).filter(([,v]) => v.types).map(([key, value]) => ({
    name: '@angular/material' + (key === '.' ? '' : key.slice(1)),
    file: path.resolve(path.dirname(material.file), value.types),
  })).sort((a,b) => a.name.localeCompare(b.name, 'en'));
  const program = ts.createProgram(entries.map(e => e.file), { target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true });
  const diagnostics = [...program.getOptionsDiagnostics(), ...program.getSyntacticDiagnostics()];
  if (diagnostics.length) throw new Error(ts.formatDiagnostics(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: () => workspace, getNewLine: () => '\n' }));
  const checker = program.getTypeChecker();
  const reflector = new TypeScriptReflectionHost(checker);
  const reader = new DtsMetadataReader(checker, reflector);
  const entities = {}, sources = {}, families = {}, relationships = [], excludedInternalExports = [];
  const indexes = Object.fromEntries(['byExport', 'byName', 'bySelector', 'byTag', 'byAttribute', 'byExportAs', 'byDeclaredInput', 'byDeclaredOutput', 'byPipeName'].map(k => [k, Object.create(null)]));
  const nodes = new Map(), queue = [];
  const fileKey = file => {
    const normalized = file.replaceAll(path.sep, '/');
    const marker = '/node_modules/';
    if (!normalized.includes(marker)) throw new Error(`Declaration outside installed packages: ${file}`);
    return normalized.slice(normalized.lastIndexOf(marker) + marker.length);
  };
  function evidence(node) {
    const sf = node.getSourceFile(), file = fileKey(sf.fileName);
    sources[file] ??= { sha256: hash(sf.text) };
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return { file, line: pos.line + 1, column: pos.character + 1 };
  }
  for (const p of Object.values(packages)) sources[fileKey(p.file)] = { sha256: hash(p.text) };
  function addIndex(index, key, id) {
    if (key) (index[key] ??= []).push(id);
  }
  function resolve(symbol) {
    if (!symbol) throw new Error('Unresolved declaration symbol');
    return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  }
  function ensure(symbol) {
    symbol = resolve(symbol);
    const node = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (!node?.name) throw new Error(`No named declaration for ${symbol.name}`);
    const source = evidence(node), name = node.name.getText();
    const id = `${source.file}#${name}`;
    if (!entities[id]) {
      const kind = ts.isClassDeclaration(node) ? 'class' : ts.isInterfaceDeclaration(node) ? 'interface'
        : ts.isTypeAliasDeclaration(node) ? 'type-alias' : ts.isFunctionDeclaration(node) ? 'function'
        : ts.isEnumDeclaration(node) ? 'enum' : ts.isVariableDeclaration(node) ? 'variable' : 'declaration';
      entities[id] = { id, name, kind, exports: [], source };
      nodes.set(id, node);
      queue.push(id);
      addIndex(indexes.byName, name, id);
    }
    return id;
  }
  function fromNode(node) { return ensure(checker.getSymbolAtLocation(node.name)); }
  function relate(from, to, kind, node, extra = {}) {
    relationships.push({ from, to, kind, evidence: evidence(node), ...extra });
  }
  for (const entry of entries) {
    const sf = program.getSourceFile(entry.file);
    if (!sf) throw new Error(`Missing entrypoint ${entry.name}`);
    evidence(sf);
    const module = checker.getSymbolAtLocation(sf);
    if (!module) throw new Error(`Not a declaration module: ${entry.name}`);
    const family = families[familyOf(entry.name)] ??= { entrypoints: [], runtime: [], testing: [], selectors: [], relatedFamilies: [], programmaticRules: [] };
    family.entrypoints.push(entry.name);
    const role = entry.name.split('/').includes('testing') ? 'testing' : 'runtime';
    for (const symbol of checker.getExportsOfModule(module)) {
      if (/^[_ɵ]/.test(symbol.name)) { excludedInternalExports.push(`${entry.name}#${symbol.name}`); continue; }
      const id = ensure(symbol);
      entities[id].exports.push({ entrypoint: entry.name, name: symbol.name, role });
      addIndex(indexes.byExport, `${entry.name}#${symbol.name}`, id);
      addIndex(indexes.byName, symbol.name, id);
      family[role].push(id);
    }
  }
  const selector = s => ({ text: s.toString(), element: s.element, attributes: Array.from({ length: s.attrs.length / 2 }, (_,i) => s.attrs.slice(i * 2, i * 2 + 2)),
    classes: s.classNames, not: s.notSelectors.map(selector) });
  const binding = b => ({ classPropertyName: b.classPropertyName, bindingPropertyName: b.bindingPropertyName,
    ...(b.required !== undefined ? { required: b.required } : {}), isSignal: b.isSignal });
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i], node = nodes.get(id), e = entities[id];
    // Follow declared inheritance/constructor types, not arbitrary structural assignability.
    for (const clause of node.heritageClauses ?? []) for (const type of clause.types) {
      relate(id, ensure(checker.getSymbolAtLocation(type.expression)), clause.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements', type);
    }
    if (ts.isVariableDeclaration(node) && node.type && ts.isTypeQueryNode(node.type)) {
      relate(id, ensure(checker.getSymbolAtLocation(node.type.exprName)), 'constructor-type', node.type);
    }
    if (!ts.isClassDeclaration(node)) continue;
    const ref = new Reference(node);
    const directive = reader.getDirectiveMetadata(ref), ngModule = reader.getNgModuleMetadata(ref), pipe = reader.getPipeMetadata(ref);
    const angularFields = node.members.filter(m => /^ɵ(cmp|dir|mod|pipe)$/.test(m.name?.getText() ?? ''));
    if (angularFields.length && !directive && !ngModule && !pipe) throw new Error(`Unreadable Angular metadata: ${id}`);
    if (directive?.isPoisoned || ngModule?.isPoisoned) throw new Error(`Incomplete Angular metadata: ${id}`);
    if (directive) {
      if (directive.baseClass === 'dynamic') throw new Error(`Unresolved Angular base class: ${id}`);
      e.kind = directive.isComponent ? 'component' : 'directive';
      e.angular = { selector: directive.selector, selectors: directive.selector ? CssSelector.parse(directive.selector).map(selector) : [],
        exportAs: directive.exportAs ?? [], isStandalone: directive.isStandalone,
        inputs: [...directive.inputs].map(binding), outputs: [...directive.outputs].map(binding),
        ngContentSelectors: directive.ngContentSelectors ?? [] };
      for (const s of e.angular.selectors) {
        addIndex(indexes.bySelector, s.text, id);
        addIndex(indexes.byTag, s.element, id);
        for (const [name] of s.attributes) addIndex(indexes.byAttribute, name, id);
      }
      for (const name of e.angular.exportAs) addIndex(indexes.byExportAs, name, id);
      for (const b of e.angular.inputs) addIndex(indexes.byDeclaredInput, b.bindingPropertyName, id);
      for (const b of e.angular.outputs) addIndex(indexes.byDeclaredOutput, b.bindingPropertyName, id);
      for (const host of directive.hostDirectives ?? []) {
        if (!host.directive.node) throw new Error(`Unresolved host directive: ${id}`);
        relate(id, fromNode(host.directive.node), 'host-directive', angularFields[0], { inputs: host.inputs, outputs: host.outputs });
      }
    }
    if (ngModule) {
      e.kind = 'ngmodule';
      for (const [field, kind] of [['imports', 'ngmodule-import'], ['exports', 'ngmodule-export'], ['declarations', 'ngmodule-declaration']]) {
        for (const member of ngModule[field]) relate(id, fromNode(member.node), kind, angularFields[0]);
      }
    }
    if (pipe) {
      e.kind = 'pipe';
      e.angular = { name: pipe.name, isStandalone: pipe.isStandalone };
      addIndex(indexes.byPipeName, pipe.name, id);
    }
  }
  const programmaticRules = profile.programmaticRules.map(rule => {
    const receiver = indexes.byExport[rule.export]?.[0], node = nodes.get(receiver);
    if (!node) throw new Error(`Missing rule receiver: ${rule.export}`);
    const type = checker.getTypeAtLocation(node);
    const method = type.getProperty(rule.method);
    if (!method) throw new Error(`Missing rule method: ${rule.id}`);
    const signatures = checker.getSignaturesOfType(checker.getTypeOfSymbolAtLocation(method, node), ts.SignatureKind.Call).map(sig => ({
      parameterTypes: sig.parameters.map(p => checker.typeToString(checker.getTypeOfSymbolAtLocation(p, sig.declaration), undefined, ts.TypeFormatFlags.NoTruncation)),
      evidence: evidence(sig.declaration),
    }));
    const args = signatures.map(s => s.parameterTypes[rule.argumentIndex] ?? '');
    if (!args.some(t => /\bComponentType</.test(t)) || args.some(t => /\bTemplateRef</.test(t)) !== rule.templateOverload) throw new Error(`Opener signature changed: ${rule.id}`);
    families[rule.family].programmaticRules.push(rule.id);
    return { ...rule, receiver, provenance: 'reviewed-rule-with-declaration-check', signatures };
  });
  for (const [name, family] of Object.entries(families)) {
    const members = new Set([...family.runtime, ...family.testing]);
    family.selectors = ordered([...members].flatMap(id => entities[id].angular?.selectors?.map(s => s.text) ?? []));
    const related = [...members].flatMap(id => entities[id].exports.map(e => familyOf(e.entrypoint)));
    for (const edge of relationships) if (members.has(edge.from)) related.push(...entities[edge.to].exports.map(e => familyOf(e.entrypoint)));
    family.relatedFamilies = ordered(related.filter(f => f !== name));
    for (const field of ['entrypoints', 'runtime', 'testing', 'programmaticRules']) family[field] = ordered(family[field]);
  }
  for (const index of Object.values(indexes)) for (const key of Object.keys(index)) index[key] = ordered(index[key]);
  return {
    schema: 'angular-material-catalog/v1', versions, profileSha256: hash(profileText),
    coverage: { status: 'complete-for-installed-typed-entrypoints', typedEntrypoints: entries.map(e => e.name).sort(),
      excludedPackageExports: Object.entries(material.pkg.exports).filter(([,v]) => !v.types).map(([k]) => k).sort(),
      excludedInternalExports: excludedInternalExports.sort(),
      boundaries: ['Package metadata only; no application usage proof.', 'Bindings are declared, not flattened across inheritance or host directives.',
        'Supporting declarations include reachable CDK/Angular types, not a complete CDK catalog.',
        'No standalone template dependency graph, runtime alias identity, CSS/theme API, adapter packages, or exhaustive conceptual relationships.',
        'TypeScript syntax/options checked; dependency declaration type checking is skipped.'] },
    sources, entities, indexes, relationships, families, programmaticRules,
  };
}

if (process.argv[1] && (await realpath(process.argv[1]).catch(() => undefined)) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { workspace: { type: 'string', default: process.cwd() } } });
    process.stdout.write(JSON.stringify(await generateMaterialCatalog(values.workspace), null, 2) + '\n');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
