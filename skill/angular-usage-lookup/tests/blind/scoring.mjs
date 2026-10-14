import { readFile, readdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const key = ref => JSON.stringify([ref.file, ref.range.start.line, ref.range.start.column, ref.range.end.line, ref.range.end.column]);
const digest = value => createHash('sha256').update(value).digest('hex');
const verifiedStatus = row => ['verified', 'analyzed'].includes(row.status ?? row.result);

export function compareInventory(oracle, submission) {
  const issues = [], targets = {};
  const names = Object.keys(oracle.targets);
  if (JSON.stringify(Object.keys(submission.targets ?? {}).sort()) !== JSON.stringify([...names].sort())) issues.push('Target set differs');
  for (const target of names) {
    const expected = oracle.occurrences.filter(r => r.target === target), actual = submission.targets?.[target] ?? [];
    const wanted = new Map(expected.map(r => [key(r), r])), got = new Map(actual.map(r => [key(r), r]));
    const pairs = rows => new Set(rows.flatMap(r => r.contexts.map(c => JSON.stringify([key(r), c]))));
    const wantedPairs = pairs(expected), gotPairs = pairs(actual);
    const missing = [...wanted.keys()].filter(k => !got.has(k)), extra = [...got.keys()].filter(k => !wanted.has(k));
    const missingContextPairs = [...wantedPairs].filter(k => !gotPairs.has(k)), extraContextPairs = [...gotPairs].filter(k => !wantedPairs.has(k));
    if (actual.length !== got.size) issues.push(`${target}: duplicate locations`);
    if (actual.some(r => !Array.isArray(r.evidence) || !r.evidence.length)) issues.push(`${target}: unlinked evidence`);
    targets[target] = { expectedLocations: wanted.size, actualLocations: got.size, expectedContextPairs: wantedPairs.size, actualContextPairs: gotPairs.size,
      missing, extra, missingContextPairs, extraContextPairs, passed: !missing.length && !extra.length && !missingContextPairs.length && !extraContextPairs.length };
  }
  const wantedConfigs = oracle.configs.map(c => c.file).sort();
  const actualConfigs = [...new Set((submission.coverage ?? []).map(c => c.tsconfig ?? c.file ?? c.config))].sort();
  if (JSON.stringify(actualConfigs) !== JSON.stringify(wantedConfigs)) issues.push('Leaf config coverage differs');
  for (const coverage of submission.coverage ?? []) {
    if (!verifiedStatus(coverage)) issues.push('Leaf config coverage is unverified');
    if (!Array.isArray(coverage.evidence) || !coverage.evidence.length) issues.push('Leaf config coverage has no evidence');
  }
  return { targets, issues, passed: !issues.length && Object.values(targets).every(t => t.passed) };
}

// Check that each claimed context links to native collector/compiler evidence supporting
// that target and source site. Classification/non-bindable reasoning still gets
// a human/agent review; these checks do not turn source text into semantic proof.
export async function verifyEvidence(oracle, submission, workspace, output) {
  const issues = [], cache = new Map(), texts = new Map(), configurations = new Map(), identities = new Map();
  const inside = (parent, file) => file.startsWith(parent + path.sep);
  output = await realpath(output); workspace = await realpath(workspace);
  const require = createRequire(path.join(workspace, 'package.json'));
  const ts = require('typescript');
  const absolute = file => path.resolve(workspace, file);
  const read = async file => {
    if (!texts.has(file)) texts.set(file, await readFile(file, 'utf8'));
    return texts.get(file);
  };
  const point = (source, offset) => {
    const lines = source.slice(0, offset).split('\n');
    return { line: lines.length - 1, character: lines.at(-1).length };
  };
  const samePoint = (a, b) => a?.line === b?.line && a?.character === b?.character;
  const contains = (range, p) => range && p &&
    (range.start.line < p.line || (range.start.line === p.line && range.start.character <= p.character)) &&
    (range.end.line > p.line || (range.end.line === p.line && range.end.character > p.character));
  const uriPath = uri => { try { return fileURLToPath(uri); } catch { return null; } };
  const offsetAt = (source, p) => {
    const lines = source.split('\n');
    if (!Number.isInteger(p?.line) || !Number.isInteger(p?.character) || p.line < 0 || p.line >= lines.length || p.character < 0 || p.character > lines[p.line].length) return -1;
    return lines.slice(0, p.line).reduce((n, line) => n + line.length + 1, 0) + p.character;
  };
  const sortedPaths = files => files.map(absolute).sort();
  const pathList = files => Array.isArray(files) && files.every(file => typeof file === 'string');
  const samePaths = (files, expected) => pathList(files) && JSON.stringify(sortedPaths(files)) === JSON.stringify([...expected].sort());
  async function config(file) {
    const configFile = absolute(file);
    if (!inside(workspace, configFile)) throw new Error('Config escapes workspace');
    if (!configurations.has(configFile)) {
      const parsed = ts.getParsedCommandLineOfConfigFile(configFile, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
      if (!parsed || parsed.errors.length) throw new Error(`Cannot independently parse config ${file}`);
      const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences });
      configurations.set(configFile, { file: configFile, hash: digest(await read(configFile)), parsed,
        roots: new Set(parsed.fileNames.map(absolute)), members: new Set(program.getSourceFiles().map(sf => absolute(sf.fileName))),
        applicationMembers: new Set(program.getSourceFiles().filter(sf => !sf.isDeclarationFile && inside(workspace, absolute(sf.fileName)) &&
          !sf.fileName.split(path.sep).includes('node_modules')).map(sf => absolute(sf.fileName))) });
    }
    return configurations.get(configFile);
  }
  async function identity(name) {
    if (!identities.has(name)) {
      const wanted = oracle.targets[name];
      if (!wanted) throw new Error(`Unknown target ${name}`);
      let declaration;
      if (wanted.file) {
        const file = absolute(wanted.file), source = await read(file);
        const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
        const found = ast.statements.filter(node => ts.isClassDeclaration(node) && node.name?.text === wanted.symbol);
        if (found.length !== 1) throw new Error('Expected target is not one exact class');
        declaration = found[0];
      } else {
        // Resolve the installed entry point through TS, then follow its public
        // exported symbol. Merely sharing a Material folder/name is not identity.
        const options = { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext };
        const resolved = ts.resolveModuleName(wanted.package, path.join(workspace, '__identity__.ts'), options, ts.sys).resolvedModule;
        if (!resolved) throw new Error(`Cannot resolve expected package ${wanted.package}`);
        const program = ts.createProgram([resolved.resolvedFileName], options), checker = program.getTypeChecker();
        const module = program.getSourceFile(resolved.resolvedFileName);
        let symbol = checker.getExportsOfModule(checker.getSymbolAtLocation(module)).find(s => s.name === wanted.symbol);
        if (symbol?.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
        declaration = symbol?.valueDeclaration;
        if (!declaration || !ts.isClassDeclaration(declaration)) throw new Error('Expected package export is not a class');
      }
      const sf = declaration.getSourceFile(), source = await read(sf.fileName), start = declaration.name.getStart(sf), end = declaration.name.getEnd();
      identities.set(name, { symbol: wanted.symbol, declarationName: declaration.name.text, file: sf.fileName, offset: start, hash: digest(source),
        range: { start: point(source, start), end: point(source, end) },
        members: declaration.members.filter(m => m.name && ts.isIdentifier(m.name)).map(m => ({ start: point(source, m.name.getStart(sf)), end: point(source, m.name.getEnd()) })) });
    }
    return identities.get(name);
  }
  async function artifacts(links) {
    const results = [];
    for (const link of links ?? []) {
      const file = typeof link === 'string' && await realpath(path.resolve(output, link)).catch(() => null);
      if (!file || !inside(output, file)) { issues.push(`Invalid evidence link ${String(link)}`); continue; }
      try {
        if (!cache.has(file)) cache.set(file, JSON.parse(await read(file)));
        results.push(cache.get(file));
      } catch { issues.push(`Unreadable evidence ${link}`); }
    }
    return results;
  }
  function configHeader(report, cfg) {
    const file = typeof report.config === 'string' ? report.config : report.config?.file;
    return typeof file === 'string' && absolute(file) === cfg.file && report.configHash === cfg.hash && samePaths(report.rootFiles, cfg.roots);
  }
  function directConfig(report, cfg) {
    return configHeader(report, cfg) &&
      pathList(report.programFiles) && [...cfg.roots].every(file => report.programFiles.some(p => absolute(p) === file)) &&
      report.programFiles.every(file => file.endsWith('.ngtypecheck.ts') || cfg.members.has(absolute(file)));
  }
  function queryConfig(report, cfg) {
    return configHeader(report, cfg) && Array.isArray(report.queries) && samePaths(report.applicationProgramFiles, cfg.applicationMembers);
  }
  async function ownership(proof, cfg, request) {
    if (proof?.backend === 'angular-compiler') return directConfig({ ...proof, config: proof.configFile }, cfg);
    if (!proof || absolute(proof.configFile ?? '') !== cfg.file || !cfg.members.has(absolute(proof.owner ?? ''))) return false;
    const queryFile = uriPath(request?.textDocument?.uri);
    if (queryFile && /\.[cm]?tsx?$/.test(queryFile) && absolute(proof.owner) !== queryFile) return false;
    if (proof.configHash !== undefined && proof.configHash !== cfg.hash) return false;
    if (Array.isArray(proof.enabledConfigs) && proof.enabledConfigs.length) {
      const enabled = await Promise.all(proof.enabledConfigs.map(config));
      const membership = enabled.filter(c => c.members.has(absolute(proof.owner))).map(c => c.file);
      return membership.length === 1 && membership[0] === cfg.file;
    }
    return proof.configHash === cfg.hash;
  }
  async function collectorCoverage(report, cfg) {
    if (report.collectionStatus !== 'succeeded' || report.stage !== 'semantic-reference-collection' || absolute(report.run?.workspace ?? '') !== workspace) return false;
    for (const row of report.coverage ?? []) {
      if (absolute(row.tsconfig ?? '') !== cfg.file || row.result !== 'verified') continue;
      if (await ownership(row.queryConfigEvidence, cfg)) return true;
      const proof = row.configLoadEvidence;
      if (proof?.configHash === cfg.hash && absolute(proof.configFile ?? '') === cfg.file &&
          Array.isArray(proof.rootFiles) && JSON.stringify(sortedPaths(proof.rootFiles)) === JSON.stringify([...cfg.roots].sort())) return true;
    }
    return false;
  }
  function compilerRecord(evidence, request, row, source, cfg, wanted) {
    const file = absolute(row.file), s = evidence?.sourceSpan, owner = evidence?.owner;
    if (evidence?.configEvidence && !directConfig({ ...evidence.configEvidence, config: evidence.configEvidence.configFile }, cfg)) return false;
    if (!s || !cfg.members.has(wanted.file) || !cfg.members.has(absolute(owner ?? '')) || (s.file?.startsWith('file:') ? uriPath(s.file) : absolute(s.file ?? '')) !== file) return false;
    const start = offsetAt(source, { line: row.range.start.line - 1, character: row.range.start.column - 1 });
    const end = offsetAt(source, { line: row.range.end.line - 1, character: row.range.end.column - 1 });
    if (start < 0 || end <= start || s.start?.offset !== start || s.end?.offset !== end ||
        !samePoint(s.start, point(source, start)) || !samePoint(s.end, point(source, end))) return false;
    if (uriPath(request?.textDocument?.uri) !== file || !contains({ start: point(source, start), end: point(source, end) }, request?.position)) return false;
    if (file.endsWith('.ts') && absolute(owner) !== file) return false;
    return Array.isArray(evidence.directives) && evidence.directives.some(d => d.matchSource === 0 &&
      d.ref?.filePath === wanted.file && d.ref.position === wanted.offset && d.ref.name === wanted.declarationName);
  }
  function definitionsMatch(definitions, request, row, wanted) {
    const file = absolute(row.file);
    if (!Array.isArray(definitions) || !definitions.length || uriPath(request?.textDocument?.uri) !== file) return false;
    const outer = { start: { line: row.range.start.line - 1, character: row.range.start.column - 1 }, end: { line: row.range.end.line - 1, character: row.range.end.column - 1 } };
    if (!contains(outer, request.position)) return false;
    const matches = (d, range) => uriPath(d.targetUri ?? d.uri) === wanted.file && samePoint((d.targetSelectionRange ?? d.range)?.start, range.start) && samePoint((d.targetSelectionRange ?? d.range)?.end, range.end);
    return definitions.some(d => matches(d, wanted.range)) && definitions.every(d => contains(d.originSelectionRange, request.position) &&
      (matches(d, wanted.range) || wanted.members.some(range => matches(d, range))));
  }
  const targetProbe = (probe, wanted) => Array.isArray(probe.definitions) && probe.definitions.length > 0 &&
    probe.definitions.every(d => d.fileName !== undefined
      ? d.fileName === wanted.file && d.textSpan?.start === wanted.offset && d.textSpan.length === wanted.declarationName.length
      : uriPath(d.targetUri ?? d.uri) === wanted.file && samePoint((d.targetSelectionRange ?? d.range)?.start, wanted.range.start) && samePoint((d.targetSelectionRange ?? d.range)?.end, wanted.range.end));
  // Coverage evidence is validated even for configs/targets with no positive
  // sites. Listing filenames or successful-looking flags is never sufficient.
  for (const wanted of oracle.configs) {
    const entries = (submission.coverage ?? []).filter(row => (row.tsconfig ?? row.file ?? row.config) === wanted.file);
    let verified = false;
    for (const row of entries) {
      if (!verifiedStatus(row) || !row.evidence?.length) continue;
      try {
        const cfg = await config(wanted.file);
        for (const report of await artifacts(row.evidence)) if (directConfig(report, cfg) || queryConfig(report, cfg) || await collectorCoverage(report, cfg)) verified = true;
      } catch (error) { issues.push(`Coverage ${wanted.file}: ${error.message}`); }
    }
    if (!verified) issues.push(`Unverified leaf config ${wanted.file}`);
  }
  for (const [target, records] of Object.entries(submission.targets)) for (const row of records) {
    const file = path.resolve(workspace, row.file);
    if (!inside(workspace, file)) { issues.push(`${target}: source escapes workspace`); continue; }
    const source = await read(file), sourceHash = digest(source);
    const supported = new Set();
    const wanted = await identity(target);
    for (const report of await artifacts(row.evidence)) for (const context of row.contexts) {
      try {
        const cfg = await config(context);
        if (queryConfig(report, cfg)) {
          const claimed = report.targets?.[target];
          if (claimed?.symbol !== wanted.symbol || absolute(claimed.file ?? '') !== wanted.file || claimed.offset !== wanted.offset || claimed.sha256 !== wanted.hash) continue;
          for (const query of report.queries) {
            const proof = query.response?.configEvidence;
            if (query.target !== target || query.file !== row.file || query.fileHash !== sourceHash || proof?.backend !== 'angular-compiler' ||
                !directConfig({ ...proof, config: proof.configFile }, cfg) || !proof.programFiles.some(file => absolute(file) === absolute(query.response.owner ?? ''))) continue;
            if (compilerRecord(query.response, query.request, row, source, cfg, wanted)) supported.add(context);
          }
          continue;
        }
        if (directConfig(report, cfg)) {
          const claimed = report.targets?.[target];
          if (claimed?.symbol !== wanted.symbol || absolute(claimed.file ?? '') !== wanted.file || claimed.absolute !== wanted.file || claimed.offset !== wanted.offset) continue;
          for (const record of report.records ?? []) {
            if (record.target !== target || record.file !== row.file || record.sourceHash !== sourceHash ||
                record.openingTag !== source.slice(record.offset, record.endOffset) || !report.programFiles.some(p => absolute(p) === absolute(record.compilerEvidence?.owner ?? ''))) continue;
            if (record.offset !== record.compilerEvidence?.sourceSpan?.start.offset || record.endOffset !== record.compilerEvidence?.sourceSpan?.end.offset) continue;
            if (compilerRecord(record.compilerEvidence, record.request, row, source, cfg, wanted)) supported.add(context);
          }
          continue;
        }
        if (!await collectorCoverage(report, cfg) || report.target?.symbol !== wanted.symbol ||
            absolute(report.target.file ?? '') !== wanted.file || report.target.fileHash !== wanted.hash || report.target.member !== undefined) continue;
        for (const ref of report.references ?? []) if (key(ref) === key(row) && ref.fileHash === sourceHash && ref.contexts?.some(c => c.tsconfig === context)) {
          // Normalized references must link back to the original LSP locations,
          // not just repeat the submitted coordinates in another JSON object.
          for (const evidence of report.evidence ?? []) if (ref.evidence?.includes(evidence.id) && evidence.backend === 'angular') {
            let qualified = false;
            for (const coverage of report.coverage ?? []) if (coverage.project === evidence.project && coverage.tsconfig === context && coverage.result === 'verified' &&
                coverage.probes?.some(probe => targetProbe(probe, wanted) && uriPath(probe.request?.textDocument?.uri) === uriPath(evidence.query?.textDocument?.uri) && samePoint(probe.request?.position, evidence.query?.position)) &&
                await ownership(coverage.queryConfigEvidence, cfg, evidence.query)) qualified = true;
            if (!qualified) continue;
            const raw = evidence.raw;
            if (Array.isArray(raw) && raw.some(r => uriPath(r.uri) === file &&
              samePoint(r.range?.start, { line: row.range.start.line - 1, character: row.range.start.column - 1 }) &&
              samePoint(r.range?.end, { line: row.range.end.line - 1, character: row.range.end.column - 1 }))) supported.add(context);
          }
        }
        for (const candidate of report.candidateEvidence ?? []) {
          if (candidate.file !== row.file || candidate.fileHash !== sourceHash || candidate.tsconfig !== context || !await ownership(candidate.queryConfigEvidence, cfg, candidate.request)) continue;
          const valid = candidate.definitionBackend === 'angular-compiler'
            ? compilerRecord(candidate.compilerEvidence, candidate.request, row, source, cfg, wanted)
            : definitionsMatch(candidate.definitions, candidate.request, row, wanted);
          if (valid) supported.add(context);
        }
      } catch (error) { issues.push(`${target}: invalid evidence for ${context}: ${error.message}`); }
    }
    for (const context of row.contexts) if (!supported.has(context)) issues.push(`${target}: unsupported context ${context} at ${key(row)}`);
  }
  return { issues, passed: !issues.length };
}

export async function integrity(workspace, hashes) {
  const files = (await readdir(workspace, { recursive: true })).filter(f => !f.split(path.sep).some(part => ['node_modules', '.nx'].includes(part)));
  const changed = [];
  for (const [file, expected] of Object.entries(hashes)) if (await readFile(path.join(workspace, file)).then(bytes => digest(bytes) !== expected, () => true)) changed.push(file);
  const added = [];
  for (const file of files) if (!Object.hasOwn(hashes, file) && await readFile(path.join(workspace, file)).then(() => true, () => false)) added.push(file);
  return { checkedFiles: Object.keys(hashes).length, changed, added, passed: !changed.length && !added.length };
}
