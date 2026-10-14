import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);

async function snapshot(directory) {
  const entries = [];
  async function visit(current) {
    const children = await readdir(current, { withFileTypes: true });
    for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(current, child.name);
      const relative = path.relative(directory, file);
      if (child.isDirectory()) {
        entries.push({ path: relative, kind: 'directory' });
        await visit(file);
      } else if (child.isSymbolicLink()) {
        entries.push({ path: relative, kind: 'symlink', target: await readlink(file) });
      } else {
        entries.push({ path: relative, kind: 'file',
          sha256: createHash('sha256').update(await readFile(file)).digest('hex') });
      }
    }
  }
  await visit(directory);
  return entries;
}

for (const scenario of [
  { name: 'a workspace without caches', existingCache: false, invalidPlugin: false },
  { name: 'a workspace with existing caches', existingCache: true, invalidPlugin: false },
  { name: 'an Nx plugin failure', existingCache: true, invalidPlugin: true },
  { name: 'an in-workspace temporary root', insideTemporary: 'child' },
  { name: 'a symlinked in-workspace temporary root', insideTemporary: 'symlink' },
  { name: 'the workspace itself as temporary root', insideTemporary: 'root' },
]) {
  test(`discovery leaves application files untouched and removes temporary caches after ${scenario.name}`, async t => {
    await mkdir(path.join(root, 'test-output'), { recursive: true });
    const run = await mkdtemp(path.join(root, 'test-output/discovery-readonly-'));
    const workspace = path.join(run, 'workspace');
    const temporary = scenario.insideTemporary === 'root' ? workspace :
      scenario.insideTemporary === 'child' ? path.join(workspace, 'scratch') : path.join(run, 'temporary');
    const nativeCache = path.join(run, 'native-cache');
    try {
      await mkdir(path.join(workspace, 'apps/example/src'), { recursive: true });
      if (scenario.insideTemporary === 'symlink') {
        await mkdir(path.join(workspace, 'scratch'));
        await symlink(path.join(workspace, 'scratch'), temporary, 'dir');
      } else await mkdir(temporary, { recursive: true });
      const files = {
        'package.json': JSON.stringify({ name: 'discovery-readonly', private: true }),
        'nx.json': JSON.stringify(scenario.invalidPlugin ? { plugins: ['./missing-plugin.cjs'] } : {}),
        'apps/example/project.json': JSON.stringify({ name: 'example', projectType: 'application',
          root: 'apps/example', sourceRoot: 'apps/example/src', targets: {
            check: { executor: 'nx:run-commands', options: {
              command: 'tsc --noEmit -p apps/example/tsconfig.app.json',
              tsConfig: 'apps/example/tsconfig.app.json',
            } },
          } }),
        'apps/example/tsconfig.app.json': JSON.stringify({ compilerOptions: { noEmit: true }, files: ['src/main.ts'] }),
        'apps/example/src/main.ts': 'export const value = 1;\n',
      };
      for (const [file, content] of Object.entries(files)) {
        await writeFile(path.join(workspace, file), content);
      }
      if (scenario.existingCache) {
        await mkdir(path.join(workspace, '.nx/cache'), { recursive: true });
        await writeFile(path.join(workspace, '.nx/cache/user-sentinel'), 'preserve existing user cache\n');
      }
      const before = await snapshot(workspace);
      const temporaryBefore = await snapshot(temporary);
      const env = { ...process.env, TMPDIR: temporary, TMP: temporary, TEMP: temporary,
        NX_NATIVE_FILE_CACHE_DIRECTORY: nativeCache };
      // A caller's cache override must not hide the application's default-write regression.
      delete env.NX_CACHE_DIRECTORY;
      delete env.NX_WORKSPACE_DATA_DIRECTORY;
      let result;
      try {
        const response = await exec(process.execPath, [path.join(root, 'scripts/discover.mjs'), '--workspace', workspace], {
          cwd: root, env, timeout: 60000, maxBuffer: 10 * 1024 * 1024,
        });
        result = { code: 0, ...response };
      } catch (error) {
        result = { code: error.code, signal: error.signal, stdout: error.stdout, stderr: error.stderr };
      }
      const after = await snapshot(workspace);
      const temporaryAfter = await snapshot(temporary);
      const evidence = { scenario, before, after, temporaryBefore, temporaryAfter, result };
      await writeFile(path.join(run, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
      t.diagnostic(`Discovery directory/hash evidence: ${path.join(run, 'evidence.json')}`);

      if (scenario.insideTemporary) {
        assert.equal(result.code, 1, 'reject inherited temporary roots inside the read-only workspace');
        assert.match(result.stderr, /temporary directory.*outside.*workspace/i);
      } else if (scenario.invalidPlugin) {
        assert.equal(result.code, 1, 'the real Nx plugin failure must propagate');
        assert.match(`${result.stdout}\n${result.stderr}`, /missing-plugin/);
      } else {
        assert.equal(result.code, 0, result.stderr);
        const report = JSON.parse(result.stdout);
        assert.equal(report.backend, 'nx-cli');
        assert.deepEqual(report.projects.map(project => project.name), ['example']);
        assert.deepEqual(report.projects[0].configs.map(config => config.file), ['apps/example/tsconfig.app.json']);
        assert.deepEqual(report.gaps, []);
      }
      assert.deepEqual(after, before, 'discovery must not create, remove or change application files, including existing .nx content');
      assert.deepEqual(temporaryAfter, temporaryBefore, 'temporary discovery caches must be cleaned on success and failure');
    } finally {
      // Retain evidence outside the workspace while removing only this test's generated inputs/caches.
      await Promise.all([workspace, temporary, nativeCache].map(directory => rm(directory, { recursive: true, force: true })));
    }
  });
}
