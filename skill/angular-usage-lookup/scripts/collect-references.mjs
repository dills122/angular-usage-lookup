import { readFile, writeFile, realpath, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { DefinitionRequest, ReferencesRequest } from 'vscode-languageserver-protocol/node';
import { startAngular } from './lsp.mjs';
import { startTypeScript } from './typescript.mjs';
import { qualifyQuery } from './angular-context.mjs';
import { compilerCandidates } from './compiler-candidates.mjs';
import { qualifiedToolchain } from './qualified-toolchain.mjs';

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

function containsPosition(range, point) {
  return (range.start.line < point.line || (range.start.line === point.line && range.start.character <= point.character)) &&
    (range.end.line > point.line || (range.end.line === point.line && range.end.character > point.character));
}

export async function collect(workspace, manifest, timeoutMs = 15000) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new Error('Timeout must be an integer from 1 to 300000 milliseconds');
  const { requireWorkspace, ts, core, serverFile, server, serviceFile, service } = qualifiedToolchain(workspace);
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
  const declaredMemberStarts = manifest.target.member === undefined
    ? declarations[0].members.filter(m => m.name && ts.isIdentifier(m.name)).map(m => position(source, m.name.getStart(ast))) : [];
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
    references: [], candidateEvidence: [], coverage: [], evidence: [], gaps: [{ code: 'reconciliation-required', message: 'The skill must reconcile candidates and scope before making a completeness claim.' }],
  };
  const refs = new Map();
  for (const project of manifest.projects) {
    const row = { project: project.name, tsconfig: project.tsconfig, result: 'failed', probes: [] };
    report.coverage.push(row);
    let client, tsClient, identityClient, compilerCandidate;
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
        let definitions = tsClient ? response.locations : response;
        // Angular's server can return no TS definition for a package import
        // while its reference request still includes the package's templates.
        // Resolve only absent TS definitions with the same config's official TS
        // service. Never replace a nonempty (possibly ambiguous) Angular result.
        let identity;
        if (client && (!definitions || (Array.isArray(definitions) && !definitions.length)) && /\.[cm]?tsx?$/.test(probe.file)) {
          identityClient ??= startTypeScript(ts, workspace, parsed);
          identity = identityClient.definition(request);
          definitions = identity.locations;
        }
        const result = { file: probe.file, request: tsClient ? response.query : request,
          definitions: tsClient ? response.raw : definitions, resolvesToTarget: matchesTarget(definitions, targetFile, targetStart) };
        if (tsClient) result.definitionChain = response.chain;
        if (identity) {
          result.angularDefinitions = response;
          result.definitionBackend = 'typescript';
          result.definitions = identity.raw;
          result.definitionChain = identity.chain;
        }
        row.probes.push(result);
        if (!result.resolvesToTarget) throw new Error(`Known reference does not resolve to target: ${probe.file} (ambiguous or wrong identity)`);
        referenceQueries.push(request);
      }
      const qualified = client && await qualifyQuery({ ts, client, configFile, parsed, probes: row.probes, workspace });
      if (client) {
        const logs = client.messages.filter(m => m.method === 'window/logMessage').map(m => m.params?.message);
        row.toolchainEvidence = logs.filter(message => message?.startsWith('Imported typescript/lib/tsserverlibrary is version ') || message?.startsWith('Using @angular/language-service v'));
        if (!logs.includes(`Imported typescript/lib/tsserverlibrary is version ${ts.version}.`) ||
            !logs.some(message => message?.startsWith(`Using @angular/language-service v${service.version} from `))) {
          throw new Error('Angular server did not confirm the qualified TypeScript and language-service versions');
        }
      }
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
      if (project.candidates !== undefined && !Array.isArray(project.candidates)) throw new Error('Candidates must be an array of explicit source anchors');
      if (project.candidates?.length && !client) throw new Error('Template candidate verification requires the Angular backend');
      const candidateOwnership = new Map();
      for (const candidate of project.candidates ?? []) {
        const result = { project: project.name, tsconfig: project.tsconfig, file: candidate.file, status: 'unresolved' };
        report.candidateEvidence.push(result);
        try {
          const owner = path.resolve(workspace, candidate.owner ?? candidate.file);
          if (!parsed.fileNames.includes(owner)) throw new Error('Candidate owner is not a root file of the declared config');
          result.fileHash = hash(await readFile(path.resolve(workspace, candidate.file)));
          if (candidate.owner) await client.open(owner);
          await client.open(path.resolve(workspace, candidate.file));
          const request = await location(workspace, candidate);
          result.request = request;
          const definitions = await client.request(DefinitionRequest.type, request);
          result.definitions = definitions;
          // The evidence must come from a uniquely owned query in this config,
          // just like reference collection. Opening the file can load a config.
          // Definition requests can enable additional configs. Reuse expensive
          // TS membership only while that snapshot and the query file agree.
          const configSnapshot = client.messages.filter(m => m.method === 'window/logMessage' && m.params?.message?.startsWith('Enabling language service for ')).map(m => m.params.message);
          const ownershipKey = JSON.stringify([request.textDocument.uri, configSnapshot]);
          let qualifiedCandidate = candidateOwnership.get(ownershipKey);
          if (!qualifiedCandidate) {
            qualifiedCandidate = await qualifyQuery({ ts, client, configFile, parsed, probes: [{ file: candidate.file, request }], workspace });
            candidateOwnership.set(ownershipKey, qualifiedCandidate);
          }
          result.queryConfigEvidence = qualifiedCandidate.evidence;
          if (candidate.backend !== undefined && !['angular', 'angular-compiler'].includes(candidate.backend)) throw new Error(`Unsupported candidate backend: ${candidate.backend}`);
          if (candidate.backend === 'angular-compiler') {
            if (manifest.target.member !== undefined) throw new Error('Compiler candidate backend supports directive/component class associations only');
            compilerCandidate ??= await compilerCandidates(workspace, configFile);
            result.definitionBackend = 'angular-compiler';
            result.compilerEvidence = compilerCandidate(owner, request, targetFile, identifier.getStart(ast));
            result.resolvesToTarget = result.compilerEvidence.resolvesToTarget;
            result.status = result.resolvesToTarget ? 'confirmed' : 'rejected';
            result.presentInReferences = raw.some(r => r.uri === request.textDocument.uri && containsPosition(r.range, request.position));
            continue;
          }
          const targetDefinitions = Array.isArray(definitions) ? definitions.filter(d => matchesTarget([d], targetFile, targetStart)) : [];
          const exact = matchesTarget(definitions, targetFile, targetStart);
          // A selector that is also an input can return the class AND its own
          // declared setter/property. Require the class itself and prove every
          // other destination by exact AST identifier position. Inherited or
          // foreign APIs, and member-target queries, do not get this rule.
          const ownedMembers = !exact && targetDefinitions.length > 0 && declaredMemberStarts.length > 0 &&
            definitions.every(d => matchesTarget([d], targetFile, targetStart) || declaredMemberStarts.some(start => matchesTarget([d], targetFile, start)));
          result.resolvesToTarget = exact || ownedMembers;
          if (result.resolvesToTarget) result.definitionIdentity = exact ? 'exact-target' : 'target-and-declared-members';
          if (result.resolvesToTarget) {
            // Keep native definition origins; they may describe an attribute or
            // a whole element, and must not be fabricated into reference spans.
            if (!definitions.every(d => d.originSelectionRange && containsPosition(d.originSelectionRange, request.position))) {
              throw new Error('Candidate definition has no source origin containing its anchor');
            }
            result.status = 'confirmed';
            result.presentInReferences = raw.some(r => r.uri === request.textDocument.uri && containsPosition(r.range, request.position));
          } else if (Array.isArray(definitions) && definitions.length && !targetDefinitions.length) {
            result.status = 'rejected';
          } else {
            throw new Error('Candidate has absent or ambiguous definitions; identity remains unresolved');
          }
        } catch (error) {
          result.error = error.message;
          report.gaps.push({ code: 'candidate-unresolved', project: project.name, file: candidate.file, message: error.message });
        }
      }
      row.result = 'verified';
    } catch (error) {
      report.collectionStatus = 'failed';
      row.error = error.message;
      if (error.process) { row.process = error.process; row.messages = error.messages; }
      report.gaps.push({ code: 'project-analysis-failed', project: project.name, message: error.message });
    } finally {
      tsClient?.dispose();
      identityClient?.dispose();
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
