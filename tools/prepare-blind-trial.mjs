// Development-only trial packaging. Private expectations never enter inputs.
import { cp, mkdir, readFile, writeFile, realpath, lstat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generate } from '../skill/angular-usage-lookup/tests/blind/workspace.mjs';

const exec = promisify(execFile), hash = data => createHash('sha256').update(data).digest('hex');
const repo = fileURLToPath(new URL('../', import.meta.url));

// Render only public declaration identities, never serialize expectation data.
export function trialRequest(input, targets) {
  const installed = path.join(input, 'installed/angular-usage-lookup/SKILL.md');
  const workspace = path.join(input, 'workspace');
  const output = path.join(input, 'output');
  const identities = ['card', 'option', 'padding'].map(key => {
    const { symbol, file, package: packageName } = targets[key];
    return `- (${key}) ${symbol}${file ? ` declared at ${file}` : ` from ${packageName}`}.`;
  }).join('\n');
  return `# Fresh-context Angular usage lookup

Read and use the installed skill at ${installed}. Independently find usages in ${workspace} of these exact targets:

${identities}

Include every application, library, test and story configuration. Discover your own scope, leaf configs, probes and candidates. Investigate peculiar observations before finalizing. Do not request hints from another agent.

The workspace, installed helper/skill and their dependencies are read-only. Use existing installed tools and dependencies at their paths. Do not install packages, change source/config files, modify helper code, perform Git changes or write your scripts/reports anywhere except ${output}. The installed helper may create and remove its own operating-system temporary files. Put your temporary scripts and reports in that output directory. You are not alone; do not revert other work.

Use only this request, the installed skill and application inputs under ${input}, and evidence you create in ${output}. Do not read outside input, parent repository files, trial answer keys, grading data, fixture generators, prior reports/submissions, conversation history from other chats, graph indexes or other agents' work. These are instruction-level access limits, not an OS security boundary.

Save a classified Markdown report and JSON report plus native evidence under ${output}. Preserve raw failed attempts, backend responses, source hashes, exact identity/config checks and native ranges. Distinguish confirmed semantic references, active template sites, code dependencies, indirect relationships, collateral and unresolved candidates. Keep declarations and inactive markup out of active site totals. Static source sites do not establish runtime execution.

Keep collector JSON unchanged. If you invoke an installed adapter directly, save an envelope with config (workspace-relative path), configHash (SHA-256), rootFiles, applicationProgramFiles (all non-declaration workspace source files in the official program, excluding node_modules), targets and queries. Each targets entry uses its requested key and records symbol, file, offset (declaration identifier) and sha256. Each query records target key, file, fileHash (SHA-256), request and the unchanged native response. Preserve the native response's config/program evidence. Link these JSON files from the inventory. Do not replace native evidence with success flags or prose.

Also save ${path.join(output, 'inventory.json')} with this structure:

\`\`\`json
{
  "targets": { "card": [], "option": [], "padding": [] },
  "coverage": [],
  "gaps": []
}
\`\`\`

The target arrays must contain ONLY confirmed active static template sites, deduplicated across queries and configs. Exclude declarations, code dependencies, collateral and indirect associations; put those classifications in the full report. Each site record must have:

\`\`\`json
{ "file": "workspace-relative path", "range": { "start": { "line": 1, "column": 1 }, "end": { "line": 1, "column": 2 } }, "contexts": ["workspace-relative leaf tsconfig paths"], "evidence": ["output-relative evidence JSON paths"] }
\`\`\`

The numbers above illustrate the coordinate schema only. Report actual one-based UTF-16 half-open source spans for the full opening element/template tag. Retain native provider ranges separately in evidence. Merge all proven config contexts for each physical occurrence, including transitive consumers.

Coverage must account for every discovered leaf config, including configs without confirmed target sites. Each coverage row must include config (workspace-relative leaf tsconfig), status, reason and evidence (output-relative JSON paths). Use status verified only when semantic coverage is supported; keep failures, unavailable capabilities and unresolved scope/identity as gaps and use partial when appropriate. Do not silently narrow scope to successful queries. Return artifact paths and key limitations when complete.
`;
}

export async function prepare(input, privateRoot, variant) {
  const canonical = async file => path.join(await realpath(path.dirname(path.resolve(file))), path.basename(file));
  input = await canonical(input); privateRoot = await canonical(privateRoot);
  if (input === privateRoot || input.startsWith(privateRoot + path.sep) || privateRoot.startsWith(input + path.sep)) throw new Error('Input and private directories must be disjoint');
  for (const dir of [input, privateRoot]) if (await lstat(dir).then(() => true, e => { if (e.code !== 'ENOENT') throw e; return false; })) throw new Error('Trial output directories must be new');
  if (!['baseline', 'transformed'].includes(variant)) throw new Error('Unknown fixture variant');
  const skill = path.join(repo, 'skill/angular-usage-lookup');
  const version = JSON.parse(await readFile(path.join(skill, 'package.json'))).version;
  const zip = path.join(repo, `dist/angular-usage-lookup-${version}.zip`);
  const bytes = await readFile(zip), digest = hash(bytes);
  if (digest !== (await readFile(zip + '.sha256', 'utf8')).split(/\s+/)[0]) throw new Error('Bundle checksum mismatch');
  await mkdir(input); await mkdir(privateRoot);
  const workspace = path.join(input, 'workspace');
  const oracle = await generate(workspace, variant);
  await writeFile(path.join(privateRoot, 'oracle.json'), JSON.stringify(oracle, null, 2));
  const hashes = Object.fromEntries(await Promise.all(oracle.files.map(async file => [file, hash(await readFile(path.join(workspace, file)))])));
  await writeFile(path.join(privateRoot, 'source-hashes.json'), JSON.stringify(hashes, null, 2));
  await cp(path.join(skill, 'node_modules'), path.join(workspace, 'node_modules'), { recursive: true, verbatimSymlinks: true });
  const dependencies = path.join(workspace, 'node_modules');
  for (const file of await readdir(dependencies, { recursive: true })) {
    const absolute = path.join(dependencies, file);
    if ((await lstat(absolute)).isSymbolicLink() && !(await realpath(absolute)).startsWith(dependencies + path.sep)) throw new Error('Dependency link escapes input');
  }
  await writeFile(path.join(input, 'skill.zip'), bytes);
  await exec('python3', ['-c', 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(input, 'skill.zip'), path.join(input, 'installed')]);
  await mkdir(path.join(input, 'output'));
  const request = path.join(input, 'request.md');
  await writeFile(request, trialRequest(input, oracle.targets));
  await writeFile(path.join(privateRoot, 'provenance.json'), JSON.stringify({ variant, bundleSha256: digest, sourceFiles: oracle.files.length,
    blinding: 'Fresh context and instruction-level access limits; not OS-enforced', oracle: 'Authored markers and config roles before any backend query' }, null, 2));
  return { input, workspace, skill: path.join(input, 'installed/angular-usage-lookup/SKILL.md'), output: path.join(input, 'output'), request, targets: oracle.targets };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { input: { type: 'string' }, private: { type: 'string' }, variant: { type: 'string' } } });
  if (!values.input || !values.private || !values.variant) throw new Error('Required: --input DIR --private DIR --variant baseline|transformed');
  console.log(JSON.stringify(await prepare(values.input, values.private, values.variant)));
}
