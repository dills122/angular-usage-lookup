import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { qualifiedToolchain } from '../scripts/qualified-toolchain.mjs';

const require = createRequire(import.meta.url);
const helperServer = require.resolve('@angular/language-server/package.json');
const helperService = require.resolve('@angular/language-service/package.json');

// Keep the workspace outside the helper tree so absent-package tests exercise
// the helper fallback, not ordinary resolution through ancestor node_modules.
async function withWorkspace(overrides, run) {
  const workspace = await realpath(await mkdtemp(path.join(tmpdir(), 'angular-qualified-toolchain-')));
  try {
    await writeFile(path.join(workspace, 'package.json'), '{}');
    const packages = { '@angular/core': '21.2.25', typescript: '5.9.3', ...overrides };
    for (const [name, version] of Object.entries(packages)) {
      if (version === null) continue;
      const directory = path.join(workspace, 'node_modules', name);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'package.json'), JSON.stringify({ name, version, main: 'index.cjs' }));
      // Only TypeScript's version is read by this guard. No real compiler or
      // language server runs in these isolated boundary tests.
      await writeFile(path.join(directory, 'index.cjs'), `module.exports = ${JSON.stringify({ version })};\n`);
    }
    await run(workspace);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

test('toolchain rejects unsupported Angular patches and mismatched TypeScript versions', async t => {
  for (const [name, overrides] of [
    ['unsupported core patch', { '@angular/core': '21.2.24' }],
    ['unsupported core major', { '@angular/core': '23.0.0' }],
    ['wrong TypeScript patch', { typescript: '5.9.2' }],
    ['wrong TypeScript major for qualified Angular 22', { '@angular/core': '22.2.2', typescript: '5.9.3' }],
  ]) await t.test(name, () => withWorkspace(overrides, workspace => {
    assert.throws(() => qualifiedToolchain(workspace), /Unqualified Angular\/TypeScript profile/);
  }));
});

test('toolchain rejects mismatched installed workspace server or service instead of falling back', async t => {
  for (const [name, overrides] of [
    ['server mismatch', { '@angular/language-server': '20.3.0', '@angular/language-service': '21.2.25' }],
    ['service mismatch', { '@angular/language-server': '21.2.25', '@angular/language-service': '21.2.24' }],
    ['server mismatch with absent service', { '@angular/language-server': '20.3.0' }],
    ['service mismatch with absent server', { '@angular/language-service': '21.2.24' }],
  ]) await t.test(name, () => withWorkspace(overrides, workspace => {
    assert.throws(() => qualifiedToolchain(workspace), /requires language-server 21\.2\.25 and language-service 21\.2\.25/);
  }));
});

test('absent workspace server and service resolve to the qualified helper installation', async () => {
  await withWorkspace({}, workspace => {
    const local = createRequire(path.join(workspace, 'package.json'));
    assert.throws(() => local.resolve('@angular/language-server/package.json'), { code: 'MODULE_NOT_FOUND' });
    assert.throws(() => local.resolve('@angular/language-service/package.json'), { code: 'MODULE_NOT_FOUND' });
    const resolved = qualifiedToolchain(workspace);
    assert.equal(resolved.serverFile, helperServer);
    assert.equal(resolved.serviceFile, helperService);
    assert.equal(resolved.core.version, '21.2.25');
    assert.equal(resolved.ts.version, '5.9.3');
  });
});

test('matching workspace tools take precedence and each absent package falls back independently', async t => {
  for (const [name, overrides] of [
    ['both workspace tools', { '@angular/language-server': '21.2.25', '@angular/language-service': '21.2.25' }],
    ['workspace server only', { '@angular/language-server': '21.2.25' }],
    ['workspace service only', { '@angular/language-service': '21.2.25' }],
  ]) await t.test(name, () => withWorkspace(overrides, workspace => {
    const resolved = qualifiedToolchain(workspace);
    assert.equal(resolved.serverFile, overrides['@angular/language-server']
      ? path.join(workspace, 'node_modules/@angular/language-server/package.json') : helperServer);
    assert.equal(resolved.serviceFile, overrides['@angular/language-service']
      ? path.join(workspace, 'node_modules/@angular/language-service/package.json') : helperService);
  }));
});

test('Angular 20 and 22 cannot silently use the Angular 21 helper toolchain', async t => {
  for (const [version, typescript] of [['20.3.33', '5.9.3'], ['22.2.2', '6.0.3']]) {
    await t.test(version, () => withWorkspace({ '@angular/core': version, typescript }, workspace => {
      assert.throws(() => qualifiedToolchain(workspace), /requires language-server .* and language-service/);
    }));
  }
});
