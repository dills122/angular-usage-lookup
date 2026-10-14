import { readFile, writeFile, realpath, lstat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { DefinitionRequest, ReferencesRequest } from 'vscode-languageserver-protocol/node';
import { startAngular } from './lsp.mjs';
import { startTypeScript } from './typescript.mjs';
import { qualifyQuery } from './angular-context.mjs';

const helperRequire = createRequire(import.meta.url);
const hash = data => createHash('sha256').update(data).digest('hex');
const normalized = range => ({ start: { line: range.start.line + 1, column: range.start.character + 1 },
  end: { line: range.end.line + 1, column: range.end.character + 1 } });

function position(source, offset) {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
}

async function location(workspace, spec) {
  const file = path.resolve(workspace, spec.file);
  const source = await readFile(file, 'utf8');
  if (!spec.text || !Number.isInteger(spec.occurrence ?? 0) || (spec.occurrence ?? 0) < 0) throw new Error('Invalid query anchor');
  let offset = -1;
  for (let i = 0; i <= (spec.occurrence ?? 0); i++) {
    offset = source.indexOf(spec.text, offset + 1);
    if (offset === -1) throw new Error(`Anchor not found: ${spec.file} ${spec.text}`);
  }
  const delta = spec.offset ?? 0;
  if (!Number.isInteger(delta) || delta < 0 || delta >= spec.text.length) throw new Error('Invalid anchor offset');
  return { textDocument: { uri: pathToFileURL(file).href }, position: position(source, offset + delta) };
}

function matchesTarget(definitions, targetFile, targetStart) {
  return Array.isArray(definitions) && definitions.length > 0 && definitions.every(d => {
    const uri = d.targetUri ?? d.uri;
    const range = d.targetSelectionRange ?? d.range;
    return fileURLToPath(uri) === targetFile && range.start.line === targetStart.line && range.start.character === targetStart.character;
  });
}

export async function collect(workspace, manifest, timeoutMs = 15000) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new Error('Timeout must be an integer from 1 to 300000 milliseconds');
  const requireWorkspace = createRequire(path.join(workspace, 'package.json'));
  const ts = requireWorkspace('typescript');
  const core = requireWorkspace('@angular/core/package.json');
  const serverFile = helperRequire.resolve('@angular/language-server/package.json');
  const server = helperRequire('@angular/language-server/package.json');
  const serviceFile = helperRequire.resolve('@angular/language-service/package.json');
  const service = helperRequire('@angular/language-service/package.json');
  if (!core.version.startsWith('21.') || !ts.version.startsWith('5.9.') || service.version !== core.version) {
    throw new Error(`Pilot requires Angular ${service.version} and TypeScript 5.9.x; workspace resolves ${core.version} / ${ts.version}`);
  }
  const targetFile = path.resolve(workspace, manifest.target.file);
  const source = await readFile(targetFile, 'utf8');
  const ast = ts.createSourceFile(targetFile, source, ts.ScriptTarget.Latest, true);
  const declarations = ast.statements.filter(s => ts.isClassDeclaration(s) && s.name?.text === manifest.target.symbol);
  if (declarations.length !== 1) throw new Error('Target must resolve to exactly one top-level class declaration');
  let identifier = declarations[0].name;
  if (manifest.target.member !== undefined) {
    const members = declarations[0].members.filter(m => m.name && ts.isIdentifier(m.name) && m.name.text === manifest.target.member);
    if (members.length !== 1) throw new Error('Member target must resolve to exactly one explicitly declared identifier; resolve inherited/overloaded APIs separately');
    identifier = members[0].name;
  }
  const targetStart = position(source, identifier.getStart(ast));
  const targetEnd = position(source, identifier.getEnd());
  const targetRequest = { textDocument: { uri: pathToFileURL(targetFile).href }, position: targetStart };
  if (!Array.isArray(manifest.projects) || !manifest.projects.length) throw new Error('At least one explicit project is required');
  const report = {
    schemaVersion: 'angular-usage-lookup/v1', stage: 'semantic-reference-collection', status: 'partial', collectionStatus: 'succeeded',
    run: { timestamp: new Date().toISOString(), workspace, node: process.version, positionEncoding: 'utf-16',
      versions: { angular: core.version, typescript: ts.version, languageServer: server.version, languageService: service.version } },
    target: { ...manifest.target, range: normalized({ start: targetStart, end: targetEnd }), fileHash: hash(source) },
    scope: { projects: manifest.projects.map(p => ({ name: p.name, tsconfig: p.tsconfig })),
      exclusions: manifest.exclusions ?? [],
      boundary: 'Explicit manifest configurations only; candidate reconciliation and dynamic flow are not collected.' },
    references: [], coverage: [], evidence: [], gaps: [{ code: 'reconciliation-required', message: 'The skill must reconcile candidates and scope before making a completeness claim.' }],
  };
  const refs = new Map();
  for (const project of manifest.projects) {
    const row = { project: project.name, tsconfig: project.tsconfig, result: 'failed', probes: [] };
    report.coverage.push(row);
    let client, tsClient;
    try {
      const configFile = path.resolve(workspace, project.tsconfig);
      const parsed = ts.getParsedCommandLineOfConfigFile(configFile, {}, { ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: d => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); } });
      if (!parsed || parsed.errors.length) throw new Error(`Config parse failed: ${parsed?.errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
      if (!parsed.fileNames.includes(path.resolve(workspace, project.anchor.file))) throw new Error('Anchor is not a root file of the declared config');
      row.backend = project.backend ?? 'angular';
      if (!['angular', 'typescript'].includes(row.backend)) throw new Error(`Unsupported backend: ${row.backend}`);
      if (row.backend === 'typescript') {
        tsClient = startTypeScript(ts, workspace, parsed);
        tsClient.requireFile(targetFile);
        row.capabilities = ['typescript-references'];
        row.configLoadEvidence = { configFile, configHash: hash(await readFile(configFile)), rootFiles: parsed.fileNames, targetInProgram: true };
        report.gaps.push({ code: 'templates-not-analyzed', project: project.name, message: 'TypeScript backend does not analyze Angular templates; this row covers TypeScript references only.' });
      } else {
        row.capabilities = ['typescript-references', 'angular-template-references'];
        client = await startAngular({ workspace, timeoutMs,
          executable: path.resolve(path.dirname(serverFile), server.bin.ngserver),
          tsProbe: path.dirname(requireWorkspace.resolve('typescript/package.json')),
          ngProbe: path.dirname(serviceFile) });
        await client.open(path.resolve(workspace, project.anchor.file));
        // Opening roots lets Angular associate external templates, including non-sibling filenames.
        for (const file of parsed.fileNames) if (file !== path.resolve(workspace, project.anchor.file)) await client.open(file);
      }
      row.anchor = { file: project.anchor.file };
      if (!project.probes?.length) throw new Error('At least one known reference probe is required per config');
      const referenceQueries = [targetRequest];
      for (const probe of project.probes) {
        if (client && !parsed.fileNames.includes(path.resolve(workspace, probe.owner ?? probe.file))) {
          throw new Error(`Probe owner is not a root file of the declared config: ${probe.owner ?? probe.file}`);
        }
        if (client && probe.owner) await client.open(path.resolve(workspace, probe.owner));
        if (client) await client.open(path.resolve(workspace, probe.file));
        const request = await location(workspace, probe);
        const response = tsClient ? tsClient.definition(request) : await client.request(DefinitionRequest.type, request);
        const definitions = tsClient ? response.locations : response;
        const result = { file: probe.file, request: tsClient ? response.query : request,
          definitions: tsClient ? response.raw : definitions, resolvesToTarget: matchesTarget(definitions, targetFile, targetStart) };
        if (tsClient) result.definitionChain = response.chain;
        row.probes.push(result);
        if (!result.resolvesToTarget) throw new Error(`Known reference does not resolve to target: ${probe.file} (ambiguous or wrong identity)`);
        referenceQueries.push(request);
      }
      const qualified = client && await qualifyQuery({ ts, client, configFile, parsed, probes: row.probes, workspace });
      const response = tsClient ? tsClient.references(referenceQueries) : await client.request(ReferencesRequest.type, { ...qualified.request, context: { includeDeclaration: true } });
      if (client) {
        // Requests may load another project. Recheck before assigning contexts.
        const after = await qualifyQuery({ ts, client, configFile, parsed, probes: row.probes, workspace });
        if (JSON.stringify(after.request) !== JSON.stringify(qualified.request)) throw new Error('Query config ownership changed during collection');
        row.queryConfigEvidence = after.evidence;
      }
      const raw = tsClient ? response.locations : response;
      if (!Array.isArray(raw) || !raw.length) throw new Error('No reference evidence returned, including the known declaration');
      const evidenceId = `references-${report.evidence.length + 1}`;
      report.evidence.push({ id: evidenceId, project: project.name, backend: row.backend,
        query: tsClient ? response.query : qualified.request, raw: tsClient ? response.raw : raw });
      if (client) {
        row.configLoadEvidence = client.messages.filter(m => m.method === 'window/logMessage' && m.params?.message?.includes(`Enabling language service for ${configFile}.`));
        if (!row.configLoadEvidence.length) throw new Error('Backend did not confirm loading the declared config');
      }
      for (const ref of raw) {
        const file = fileURLToPath(ref.uri);
        if (file.endsWith('.ngtypecheck.ts') || (ref.range.start.line === ref.range.end.line && ref.range.start.character === ref.range.end.character)) {
          throw new Error(`Unmapped reference span: ${file}`);
        }
        const content = await readFile(file, 'utf8');
        const relative = path.relative(workspace, file);
        const key = `${relative}:${JSON.stringify(ref.range)}`;
        const value = refs.get(key) ?? { file: relative, range: normalized(ref.range),
          isDeclaration: file === targetFile && ref.range.start.line === targetStart.line && ref.range.start.character === targetStart.character,
          classification: 'confirmed', kind: 'semantic-reference', fileHash: hash(content), contexts: [], evidence: [] };
        if (!value.contexts.some(c => c.project === project.name && c.tsconfig === project.tsconfig)) {
          value.contexts.push({ project: project.name, tsconfig: project.tsconfig });
        }
        if (!value.evidence.includes(evidenceId)) value.evidence.push(evidenceId);
        refs.set(key, value);
      }
      row.result = 'verified';
    } catch (error) {
      report.collectionStatus = 'failed';
      row.error = error.message;
      if (error.process) { row.process = error.process; row.messages = error.messages; }
      report.gaps.push({ code: 'project-analysis-failed', project: project.name, message: error.message });
    } finally {
      tsClient?.dispose();
      if (client) { row.messages = client.messages; row.process = await client.close(); }
    }
  }
  report.references = [...refs.values()].sort((a, b) => a.file.localeCompare(b.file) || a.range.start.line - b.range.start.line || a.range.start.column - b.range.start.column);
  return report;
}

if (process.argv[1] && (await realpath(process.argv[1]).catch(() => undefined)) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { workspace: { type: 'string' }, manifest: { type: 'string' }, output: { type: 'string' }, 'timeout-ms': { type: 'string' } } });
    if (!values.workspace || !values.manifest) throw new Error('Usage: --workspace DIR --manifest FILE [--output FILE] [--timeout-ms N]');
    const workspace = await realpath(values.workspace);
    if (values.output) {
      let output;
      try {
        if ((await lstat(values.output)).isSymbolicLink()) throw new Error('Write the report outside the scanned workspace using a regular file, not a symlink');
        output = await realpath(values.output);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        output = path.join(await realpath(path.dirname(path.resolve(values.output))), path.basename(values.output));
      }
      if (output === workspace || output.startsWith(`${workspace}${path.sep}`)) throw new Error('Write the report outside the scanned workspace');
    }
    const manifest = JSON.parse(await readFile(path.resolve(workspace, values.manifest), 'utf8'));
    const report = await collect(workspace, manifest, Number(values['timeout-ms'] ?? 15000));
    const json = `${JSON.stringify(report, null, 2)}\n`;
    if (values.output) await writeFile(values.output, json); else process.stdout.write(json);
    if (report.collectionStatus !== 'succeeded') process.exitCode = 2;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
