import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, symlink, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);

for (const [script, args, message] of [
  ['collect-references.mjs', [], /Usage: --workspace/],
  ['material-catalog.mjs', ['--not-an-option'], /Unknown option/],
]) {
  test(`${script} executes through a skill directory symlink`, async () => {
    await mkdir(path.join(root, 'test-output'), { recursive: true });
    const temporary = await mkdtemp(path.join(root, 'test-output/entrypoints-'));
    try {
      const linked = path.join(temporary, 'skill');
      await symlink(root, linked, 'dir');
      for (const base of [root, linked]) {
        await assert.rejects(exec(process.execPath, [path.join(base, 'scripts', script), ...args], { timeout: 15000 }), error => {
          assert.equal(error.code, 1);
          assert.match(error.stderr, message);
          return true;
        });
      }
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  });
}
