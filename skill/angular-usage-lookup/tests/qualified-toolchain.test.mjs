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

test('stable patch variants are compatible without claiming the exact baseline was used', async () => {
  await withWorkspace({ '@angular/core': '20.3.31', typescript: '5.9.2',
    '@angular/language-service': '20.3.31', '@angular/language-server': '20.3.0' }, workspace => {
    const resolved = qualifiedToolchain(workspace);
    assert.equal(resolved.core.version, '20.3.31');
    assert.equal(resolved.qualification.status, 'compatible-patch');
    assert.equal(resolved.qualification.baseline.angular, '20.3.33');
  });
  await withWorkspace({}, workspace => {
    assert.equal(qualifiedToolchain(workspace).qualification.status, 'baseline-profile');
  });
});

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

test('toolchain rejects unsupported minor lines, prereleases and malformed versions', async t => {
  for (const [name, overrides] of [
    ['unsupported core minor', { '@angular/core': '21.1.24' }],
    ['unsupported core major', { '@angular/core': '23.0.0' }],
    ['wrong TypeScript minor', { typescript: '5.8.3' }],
    ['core prerelease', { '@angular/core': '21.2.25-rc.0' }],
    ['TypeScript prerelease', { typescript: '5.9.3-dev.1' }],
    ['malformed core', { '@angular/core': '21.2' }],
    ['malformed TypeScript', { typescript: '5.9.03' }],
    ['wrong TypeScript major for qualified Angular 22', { '@angular/core': '22.2.2', typescript: '5.9.3' }],
  ]) await t.test(name, () => withWorkspace(overrides, workspace => {
    assert.throws(() => qualifiedToolchain(workspace), /Unqualified Angular\/TypeScript profile/);
  }));
});

test('toolchain rejects mismatched installed workspace server or service instead of falling back', async t => {
  for (const [name, overrides] of [
    ['server mismatch', { '@angular/language-server': '20.3.0', '@angular/language-service': '21.2.25' }],
    ['service mismatch', { '@angular/language-server': '21.2.25', '@angular/language-service': '21.1.24' }],
    ['server mismatch with absent service', { '@angular/language-server': '20.3.0' }],
    ['service mismatch with absent server', { '@angular/language-service': '21.1.24' }],
    ['server prerelease', { '@angular/language-server': '21.2.25-rc.0' }],
    ['service prerelease', { '@angular/language-service': '21.2.25-rc.0' }],
  ]) await t.test(name, () => withWorkspace(overrides, workspace => {
    assert.throws(() => qualifiedToolchain(workspace), /requires language-server 21\.2\.x and language-service 21\.2\.x/);
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

test('Angular 20 and 22 select matching bundled servers and services without workspace language tools', async t => {
  for (const [version, typescript] of [['20.3.33', '5.9.3'], ['22.2.2', '6.0.3']]) {
    await t.test(version, () => withWorkspace({ '@angular/core': version, typescript }, workspace => {
      const resolved = qualifiedToolchain(workspace);
      const major = version.split('.')[0];
      assert.equal(resolved.serverFile, require.resolve(`@angular/language-server-${major}/package.json`));
      assert.ok(resolved.service.version.startsWith(`${major}.`));
      assert.equal(resolved.server.version, major === '20' ? '20.3.0' : '22.2.2');
    }));
  }
});
