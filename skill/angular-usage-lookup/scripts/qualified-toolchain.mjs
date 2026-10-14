import { createRequire } from 'node:module';
import path from 'node:path';

// Exact regression baselines, distinct from the stable minor lines admitted at
// runtime. Private compiler/catalog APIs retain their own exact guards.
// https://angular.dev/reference/releases#angular-versioning
const profiles = {
  '20.3': { angular: '20.3.33', typescript: '5.9.3', languageServer: '20.3.0', languageService: '20.3.33' },
  '21.2': { angular: '21.2.25', typescript: '5.9.3', languageServer: '21.2.25', languageService: '21.2.25' },
  '22.2': { angular: '22.2.2', typescript: '6.0.3', languageServer: '22.2.2', languageService: '22.2.2' },
};

function stableMinor(version) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version)?.slice(1, 3).join('.');
}

function qualification(profile, versions) {
  return { policy: 'stable-minor-lines', status: Object.entries(versions).every(([key, version]) => version === profile[key])
    ? 'baseline-profile' : 'compatible-patch', baseline: { ...profile } };
}

export function qualifiedToolchain(workspace, { angular = true } = {}) {
  const requireWorkspace = createRequire(path.join(workspace, 'package.json'));
  const helper = createRequire(import.meta.url);
  const ts = requireWorkspace('typescript');
  const core = requireWorkspace('@angular/core/package.json');
  const profile = profiles[stableMinor(core.version)];
  if (!profile || stableMinor(ts.version) !== stableMinor(profile.typescript)) throw new Error(`Unqualified Angular/TypeScript profile: ${core.version} / ${ts.version}`);
  const versions = { angular: core.version, typescript: ts.version };
  if (!angular) return { requireWorkspace, ts, core, qualification: qualification(profile, versions) };
  const workspacePackage = name => {
    try { return requireWorkspace.resolve(`${name}/package.json`); }
    catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; return null; }
  };
  const major = core.version.split('.')[0];
  const bundledServerFile = () => helper.resolve(`@angular/language-server${major === '21' ? '' : `-${major}`}/package.json`);
  const serverFile = workspacePackage('@angular/language-server') ?? bundledServerFile();
  // Each pinned server carries its matching service. Resolve from the bundled
  // server, not a possibly unrelated hoisted service beside this helper.
  const serviceFile = workspacePackage('@angular/language-service') ??
    createRequire(bundledServerFile()).resolve('@angular/language-service/package.json');
  const server = helper(serverFile), service = helper(serviceFile);
  if (stableMinor(server.version) !== stableMinor(profile.languageServer) || stableMinor(service.version) !== stableMinor(core.version)) {
    throw new Error(`Compatible Angular ${core.version} requires language-server ${stableMinor(profile.languageServer)}.x and language-service ${stableMinor(core.version)}.x (stable releases); resolved ${server.version} / ${service.version}`);
  }
  return { requireWorkspace, ts, core, serverFile, server, serviceFile, service,
    qualification: qualification(profile, { ...versions, languageServer: server.version, languageService: service.version }) };
}
