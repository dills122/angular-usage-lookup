import { execFile } from 'node:child_process';
import { readdir, realpath, access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { parseArgs, promisify } from 'node:util';
import path from 'node:path';

const exec = promisify(execFile);
const { values } = parseArgs({ options: { workspace: { type: 'string' } } });
try {
  if (!values.workspace) throw new Error('Usage: --workspace DIR');
  const workspace = await realpath(values.workspace);
  const requireWorkspace = createRequire(path.join(workspace, 'package.json'));
  const ts = requireWorkspace('typescript');
  const relative = file => path.relative(workspace, file);
  const diagnostic = d => ts.flattenDiagnosticMessageText(d.messageText, '\n');
  const readConfig = file => {
    const result = ts.readConfigFile(file, ts.sys.readFile);
    if (result.error) throw new Error(diagnostic(result.error));
    return result.config;
  };
  let isNx = false;
  try { await access(path.join(workspace, 'nx.json')); isNx = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const report = { backend: isNx ? 'nx-cli' : 'angular-json', versions: { typescript: ts.version },
    workspace, projects: [], gaps: [], boundary: 'Configuration inventory only. Custom executors, file replacements and nonstandard config paths need skill review.' };
  let projects;
  if (isNx) {
    const packageFile = requireWorkspace.resolve('nx/package.json');
    const nx = requireWorkspace('nx/package.json');
    report.versions.nx = nx.version;
    const executable = path.resolve(path.dirname(packageFile), nx.bin.nx);
    const query = async args => {
      const { stdout } = await exec(process.execPath, [executable, ...args, '--json'], { cwd: workspace,
        env: { ...process.env, NX_DAEMON: 'false', NX_ISOLATE_PLUGINS: 'false', NX_INTERACTIVE: 'false', FORCE_COLOR: '0' },
        timeout: 30000, maxBuffer: 10 * 1024 * 1024 });
      return JSON.parse(stdout);
    };
    const names = await query(['show', 'projects']);
    projects = [];
    for (const name of names.sort()) projects.push({ ...(await query(['show', 'project', name])), name });
  } else {
    projects = Object.entries(readConfig(path.join(workspace, 'angular.json')).projects).map(([name, project]) => ({ ...project, name }));
  }
  for (const project of projects) {
    const row = { name: project.name, root: project.root ?? '', sourceRoot: project.sourceRoot ?? null,
      targets: project.targets ?? project.architect ?? {}, configs: [] };
    report.projects.push(row);
    const seeds = new Set();
    function collectPaths(value) {
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value)) {
        if (key === 'tsConfig' && typeof child === 'string') seeds.add(path.resolve(workspace, child));
        else collectPaths(child);
      }
    }
    collectPaths(row.targets);
    for (const name of await readdir(path.resolve(workspace, row.root))) {
      if (/^tsconfig(?:\..+)?\.json$/.test(name)) seeds.add(path.resolve(workspace, row.root, name));
    }
    const seen = new Set();
    function visit(file) {
      if (seen.has(file)) return;
      seen.add(file);
      const config = { file: relative(file), rootFileCount: 0, references: [], errors: [] };
      row.configs.push(config);
      try {
        const parsed = ts.getParsedCommandLineOfConfigFile(file, {}, { ...ts.sys,
          onUnRecoverableConfigFileDiagnostic: d => { throw new Error(diagnostic(d)); } });
        config.rootFileCount = parsed.fileNames.length;
        config.errors = parsed.errors.map(diagnostic);
        config.references = (parsed.projectReferences ?? []).map(ref => relative(ts.resolveProjectReferencePath(ref)));
        for (const ref of config.references) visit(path.resolve(workspace, ref));
      } catch (error) { config.errors.push(error.message); }
    }
    for (const file of [...seeds].sort()) visit(file);
    row.configs.sort((a, b) => a.file.localeCompare(b.file));
    if (!row.configs.length) report.gaps.push({ project: row.name, reason: 'No config discovered; inspect executor/test/story configuration.' });
    for (const config of row.configs) if (config.errors.length) report.gaps.push({ project: row.name, config: config.file, errors: config.errors });
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.gaps.length) process.exitCode = 2;
} catch (error) { console.error(error.message); process.exitCode = 1; }
