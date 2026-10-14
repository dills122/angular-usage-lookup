import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { compareInventory, verifyEvidence } from './scoring.mjs';

const require = createRequire(import.meta.url);
const hash = text => createHash('sha256').update(text).digest('hex');
const point = (text, offset) => { const lines = text.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1).length }; };

async function fixture(run) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'blind-grader-unit-')));
  const workspace = path.join(root, 'workspace'), output = path.join(root, 'output');
  try {
    await mkdir(workspace); await mkdir(output); await mkdir(path.join(workspace, 'node_modules'));
    await symlink(path.dirname(require.resolve('typescript/package.json')), path.join(workspace, 'node_modules/typescript'), 'dir');
    const target = 'export class Card {}\n';
    const source = "import {Card} from './target';\nconst template = '<card-pane></card-pane>';\nexport const declaration = Card;\n";
    const config = JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler' }, files: ['consumer.ts'] });
    const emptyConfig = JSON.stringify({ compilerOptions: { target: 'ES2022' }, files: ['empty.ts'] });
    for (const [file, text] of Object.entries({ 'package.json': '{}', 'target.ts': target, 'consumer.ts': source, 'empty.ts': 'export {};', 'tsconfig.json': config, 'empty.json': emptyConfig })) await writeFile(path.join(workspace, file), text);
    const openingTag = '<card-pane>', offset = source.indexOf(openingTag), endOffset = offset + openingTag.length;
    const start = point(source, offset), end = point(source, endOffset), targetOffset = target.indexOf('Card');
    const occurrence = { id: 'one', target: 'card', file: 'consumer.ts', range: { start: { line: start.line + 1, column: start.character + 1 }, end: { line: end.line + 1, column: end.character + 1 } }, contexts: ['tsconfig.json'] };
    const oracle = { targets: { card: { file: 'target.ts', symbol: 'Card' } }, occurrences: [occurrence], configs: [{ file: 'tsconfig.json' }, { file: 'empty.json' }] };
    const record = { target: 'card', file: 'consumer.ts', openingTag, offset, endOffset, sourceHash: hash(source),
      request: { textDocument: { uri: pathToFileURL(path.join(workspace, 'consumer.ts')).href }, position: { ...start, character: start.character + 1 } },
      compilerEvidence: { version: '21.2.25', owner: path.join(workspace, 'consumer.ts'), component: 'Consumer',
        sourceSpan: { file: path.join(workspace, 'consumer.ts'), start: { offset, ...start }, end: { offset: endOffset, ...end } },
        directives: [{ ref: { filePath: path.join(workspace, 'target.ts'), position: targetOffset, name: 'Card' }, matchSource: 0 }], resolvesToTarget: true } };
    const envelope = { config: 'tsconfig.json', configHash: hash(config), backend: 'angular-compiler', rootFiles: ['consumer.ts'], programFiles: ['consumer.ts', 'target.ts'],
      targets: { card: { file: 'target.ts', absolute: path.join(workspace, 'target.ts'), symbol: 'Card', offset: targetOffset } }, records: [record] };
    const emptyEnvelope = { config: 'empty.json', configHash: hash(emptyConfig), backend: 'angular-compiler', rootFiles: ['empty.ts'], programFiles: ['empty.ts'], targets: {}, records: [] };
    const submission = { targets: { card: [{ ...occurrence, evidence: ['native.json'] }] }, coverage: [
      { config: 'tsconfig.json', status: 'verified', evidence: ['native.json'] },
      { config: 'empty.json', status: 'verified', evidence: ['empty.json'] },
    ] };
    const save = async () => { await writeFile(path.join(output, 'native.json'), JSON.stringify(envelope)); await writeFile(path.join(output, 'empty.json'), JSON.stringify(emptyEnvelope)); };
    await save();
    await run({ oracle, submission, envelope, emptyEnvelope, record, workspace, output, source, target, config, targetOffset, save });
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('direct compiler evidence validates exact identities and target-free config coverage without relying on a CLI envelope', () => fixture(async f => {
  assert.equal(compareInventory(f.oracle, f.submission).passed, true);
  assert.equal((await verifyEvidence(f.oracle, f.submission, f.workspace, f.output)).passed, true);
}));

test('analyzed is accepted only with independently valid native coverage evidence', () => fixture(async f => {
  f.submission.coverage.forEach(row => { row.status = 'analyzed'; });
  assert.equal((await verifyEvidence(f.oracle, f.submission, f.workspace, f.output)).passed, true);
  f.emptyEnvelope.configHash = 'stale'; await f.save();
  assert.equal((await verifyEvidence(f.oracle, f.submission, f.workspace, f.output)).passed, false);
}));

test('package identity follows public export aliases to the exact class declaration', () => fixture(async f => {
  const folder = 'node_modules/@fixture/ui', declared = 'export declare class InternalCard {}\n';
  await mkdir(path.join(f.workspace, folder), { recursive: true });
  for (const [file, text] of Object.entries({
    'package.json': JSON.stringify({ name: '@fixture/ui', exports: { '.': { types: './index.d.ts' } } }),
    'index.d.ts': "export {InternalCard as Card} from './internal';\n",
    'internal.d.ts': declared,
    'decoy.d.ts': declared,
  })) await writeFile(path.join(f.workspace, folder, file), text);
  await writeFile(path.join(f.workspace, 'target.ts'), "export {Card} from '@fixture/ui';\n");
  f.oracle.targets.card = { package: '@fixture/ui', symbol: 'Card' };
  const file = `${folder}/internal.d.ts`, absolute = path.join(f.workspace, file), offset = declared.indexOf('InternalCard');
  f.envelope.targets.card = { file, absolute, symbol: 'Card', offset };
  f.envelope.programFiles.push(`${folder}/index.d.ts`, file);
  Object.assign(f.record.compilerEvidence.directives[0].ref, { filePath: absolute, position: offset, name: 'InternalCard' });
  await f.save();
  const accepted = await verifyEvidence(f.oracle, f.submission, f.workspace, f.output);
  assert.equal(accepted.passed, true, JSON.stringify(accepted.issues));
  f.record.compilerEvidence.directives[0].ref.filePath = path.join(f.workspace, folder, 'decoy.d.ts');
  await f.save();
  assert.equal((await verifyEvidence(f.oracle, f.submission, f.workspace, f.output)).passed, false);
}));

test('native compiler grading rejects forged identity, coordinates, context and source proof', async t => {
  const changes = {
    'foreign class offset': f => f.record.compilerEvidence.directives[0].ref.position++,
    'indirect host directive': f => f.record.compilerEvidence.directives[0].matchSource = 1,
    'wrong request URI': f => f.record.request.textDocument.uri = pathToFileURL(path.join(f.workspace, 'empty.ts')).href,
    'wrong source span': f => f.record.compilerEvidence.sourceSpan.start.offset++,
    'wrong config hash': f => f.envelope.configHash = 'stale',
    'missing config hash': f => delete f.envelope.configHash,
    'missing source hash': f => delete f.record.sourceHash,
    'missing end offset': f => delete f.record.endOffset,
    'wrong config context': f => f.envelope.config = 'empty.json',
    'foreign owner': f => f.record.compilerEvidence.owner = path.join(f.workspace, 'empty.ts'),
    'wrong program membership': f => f.envelope.programFiles = ['empty.ts'],
    'wrong opening tag': f => f.record.openingTag = '<wrong-tag>',
  };
  for (const [name, change] of Object.entries(changes)) await t.test(name, () => fixture(async f => {
    change(f); await f.save();
    assert.equal((await verifyEvidence(f.oracle, f.submission, f.workspace, f.output)).passed, false);
  }));
});

test('listed config names cannot disguise missing or unresolved target-free coverage', async t => {
  for (const [name, change] of Object.entries({
    'unresolved coverage': f => f.submission.coverage[1].status = 'unresolved',
    'unlinked coverage': f => f.submission.coverage[1].evidence = [],
    'wrong coverage artifact': f => f.submission.coverage[1].evidence = ['native.json'],
  })) await t.test(name, () => fixture(async f => {
    change(f);
    const scope = compareInventory(f.oracle, f.submission);
    const evidence = await verifyEvidence(f.oracle, f.submission, f.workspace, f.output);
    assert.equal(scope.passed && evidence.passed, false);
  }));
});

test('collector flags and arbitrary nonempty definitions cannot masquerade as native identity proof', () => fixture(async f => {
  const candidate = { status: 'confirmed', resolvesToTarget: true, file: 'consumer.ts', fileHash: hash(f.source), tsconfig: 'tsconfig.json',
    request: f.record.request, queryConfigEvidence: {}, definitions: [{ unrelated: true }] };
  await writeFile(path.join(f.output, 'native.json'), JSON.stringify({ target: { file: 'target.ts', symbol: 'Card', fileHash: hash(f.target) },
    candidateEvidence: [candidate] }));
  assert.equal((await verifyEvidence(f.oracle, f.submission, f.workspace, f.output)).passed, false);
}));

function collector(f, backend) {
  const targetStart = point(f.target, f.targetOffset), targetEnd = point(f.target, f.targetOffset + 4);
  const targetRange = { start: targetStart, end: targetEnd };
  const request = f.record.request;
  const configFile = path.join(f.workspace, 'tsconfig.json');
  const queryConfigEvidence = { configFile, owner: path.join(f.workspace, 'consumer.ts'), enabledConfigs: [configFile],
    membership: [{ file: path.join(f.workspace, 'consumer.ts'), configs: [configFile] }] };
  const definitions = [{ targetUri: pathToFileURL(path.join(f.workspace, 'target.ts')).href, targetSelectionRange: targetRange,
    originSelectionRange: { start: f.record.compilerEvidence.sourceSpan.start, end: f.record.compilerEvidence.sourceSpan.end } }];
  const candidate = { file: 'consumer.ts', fileHash: hash(f.source), tsconfig: 'tsconfig.json', request, queryConfigEvidence, definitions };
  const report = { stage: 'semantic-reference-collection', collectionStatus: 'succeeded', run: { workspace: f.workspace },
    target: { file: 'target.ts', symbol: 'Card', fileHash: hash(f.target) },
    coverage: [{ project: 'app', tsconfig: 'tsconfig.json', result: 'verified', queryConfigEvidence, probes: [{ request, definitions }] }],
    candidateEvidence: [candidate] };
  if (backend === 'angular-compiler') {
    const configEvidence = { backend, configFile, configHash: hash(f.config), rootFiles: [path.join(f.workspace, 'consumer.ts')],
      programFiles: ['consumer.ts', 'target.ts'].map(p => path.join(f.workspace, p)) };
    Object.assign(candidate, { definitionBackend: backend, queryConfigEvidence: configEvidence,
      compilerEvidence: { ...f.record.compilerEvidence, configEvidence } });
  }
  if (backend === 'references') {
    report.candidateEvidence = [];
    report.references = [{ ...f.oracle.occurrences[0], fileHash: hash(f.source), contexts: [{ project: 'app', tsconfig: 'tsconfig.json' }], evidence: ['one'] }];
    report.evidence = [{ id: 'one', project: 'app', backend: 'angular', query: request,
      raw: [{ uri: request.textDocument.uri, range: definitions[0].originSelectionRange }] }];
  }
  return report;
}

test('collector native definitions, compiler config proof and linked raw references remain accepted', async t => {
  for (const backend of ['definitions', 'angular-compiler', 'references']) await t.test(backend, () => fixture(async f => {
    await writeFile(path.join(f.output, 'native.json'), JSON.stringify(collector(f, backend)));
    const score = await verifyEvidence(f.oracle, f.submission, f.workspace, f.output);
    assert.equal(score.passed, true, JSON.stringify(score.issues));
  }));
});

test('collector grading rejects native identity, raw-query and coverage mismatches even with matching inventory', async t => {
  const changes = {
    'foreign definition': ['definitions', report => report.candidateEvidence[0].definitions[0].targetSelectionRange.start.character++],
    'wrong source URI': ['definitions', report => report.candidateEvidence[0].request.textDocument.uri = 'file:///foreign.ts'],
    'unverified report coverage': ['definitions', report => report.coverage[0].result = 'failed'],
    'empty claimed native definitions': ['definitions', report => { report.candidateEvidence[0].definitions = [{}]; report.candidateEvidence[0].resolvesToTarget = true; }],
    'missing raw location': ['references', report => report.evidence[0].raw = []],
    'wrong raw query target': ['references', report => report.coverage[0].probes[0].definitions[0].targetSelectionRange.start.character++],
    'missing raw evidence link': ['references', report => report.references[0].evidence = ['absent']],
    'unrelated raw query owner': ['references', report => report.coverage[0].queryConfigEvidence.owner = 'target.ts'],
    'stale compiler config': ['angular-compiler', report => report.candidateEvidence[0].queryConfigEvidence.configHash = 'stale'],
    'conflicting native compiler config': ['angular-compiler', report => { report.candidateEvidence[0].compilerEvidence.configEvidence = { ...report.candidateEvidence[0].queryConfigEvidence, configHash: 'stale' }; }],
    'unrelated candidate owner': ['definitions', report => report.candidateEvidence[0].queryConfigEvidence.owner = 'target.ts'],
  };
  for (const [name, [backend, change]] of Object.entries(changes)) await t.test(name, () => fixture(async f => {
    const report = collector(f, backend); change(report);
    await writeFile(path.join(f.output, 'native.json'), JSON.stringify(report));
    assert.equal((await verifyEvidence(f.oracle, f.submission, f.workspace, f.output)).passed, false);
  }));
});

function queryEnvelope(f, empty = false) {
  const configFile = empty ? 'empty.json' : 'tsconfig.json', old = empty ? f.emptyEnvelope : f.envelope;
  const configEvidence = { backend: 'angular-compiler', configFile: path.join(f.workspace, configFile), configHash: old.configHash,
    rootFiles: old.rootFiles.map(file => path.join(f.workspace, file)), programFiles: old.programFiles.map(file => path.join(f.workspace, file)) };
  return { config: { project: empty ? 'empty' : 'app', file: configFile }, configHash: old.configHash,
    rootFiles: configEvidence.rootFiles, applicationProgramFiles: old.programFiles,
    targets: empty ? {} : { card: { file: 'target.ts', symbol: 'Card', offset: f.targetOffset, sha256: hash(f.target) } },
    queries: empty ? [] : [{ target: 'card', file: 'consumer.ts', fileHash: hash(f.source), request: f.record.request,
      response: { ...f.record.compilerEvidence, configEvidence } }] };
}

test('native query response envelopes support config objects and separate application membership', () => fixture(async f => {
  await writeFile(path.join(f.output, 'native.json'), JSON.stringify(queryEnvelope(f)));
  await writeFile(path.join(f.output, 'empty.json'), JSON.stringify(queryEnvelope(f, true)));
  const score = await verifyEvidence(f.oracle, f.submission, f.workspace, f.output);
  assert.equal(score.passed, true, JSON.stringify(score.issues));
}));

test('query response envelopes still require exact native config, source and target proof', async t => {
  const changes = {
    'missing per-query source hash': report => delete report.queries[0].fileHash,
    'wrong target hash': report => report.targets.card.sha256 = 'stale',
    'missing native config evidence': report => delete report.queries[0].response.configEvidence,
    'wrong native config hash': report => report.queries[0].response.configEvidence.configHash = 'stale',
    'foreign native identity': report => report.queries[0].response.directives[0].ref.position++,
    'wrong request URI': report => report.queries[0].request.textDocument.uri = 'file:///foreign.ts',
    'wrong native source span': report => report.queries[0].response.sourceSpan.end.offset++,
    'incomplete application members': report => report.applicationProgramFiles = ['consumer.ts'],
    'malformed config object': report => report.config = { project: 'app' },
  };
  for (const [name, change] of Object.entries(changes)) await t.test(name, () => fixture(async f => {
    const report = queryEnvelope(f); change(report);
    await writeFile(path.join(f.output, 'native.json'), JSON.stringify(report));
    const score = await verifyEvidence(f.oracle, f.submission, f.workspace, f.output);
    assert.equal(score.passed, false);
    assert.equal(score.issues.some(issue => issue.includes('Received an instance of Object')), false);
  }));
});
