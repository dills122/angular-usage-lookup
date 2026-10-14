import { createRequire } from 'node:module';
import path from 'node:path';

// Exact profiles exercised by the repository suites. Other patches are not
// silently promoted into qualified support, especially across compiler APIs.
const profiles = {
  '20.3.33': { typescript: '5.9.3', server: '20.3.0' },
  '21.2.25': { typescript: '5.9.3', server: '21.2.25' },
  '22.2.2': { typescript: '6.0.3', server: '22.2.2' },
};
export function qualifiedToolchain(workspace) {
  const requireWorkspace = createRequire(path.join(workspace, 'package.json'));
  const helper = createRequire(import.meta.url);
  const ts = requireWorkspace('typescript');
  const core = requireWorkspace('@angular/core/package.json');
  const profile = profiles[core.version];
  if (!profile || ts.version !== profile.typescript) throw new Error(`Unqualified Angular/TypeScript profile: ${core.version} / ${ts.version}`);
  const resolve = name => {
    try { return requireWorkspace.resolve(`${name}/package.json`); }
    catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; return helper.resolve(`${name}/package.json`); }
  };
  const serverFile = resolve('@angular/language-server');
  const serviceFile = resolve('@angular/language-service');
  const server = helper(serverFile), service = helper(serviceFile);
  if (server.version !== profile.server || service.version !== core.version) {
    throw new Error(`Qualified Angular ${core.version} requires language-server ${profile.server} and language-service ${core.version}; resolved ${server.version} / ${service.version}`);
  }
  return { requireWorkspace, ts, core, serverFile, server, serviceFile, service };
}
