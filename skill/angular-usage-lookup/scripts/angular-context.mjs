import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ngserver chooses a default project from the *query file*, not from the manifest.
// Loading a config does not prove that it answered a request. Use a consumer
// owned by exactly one enabled Angular program, or leave the row unresolved.
export async function qualifyQuery({ ts, client, configFile, parsed, probes, workspace }) {
  const configs = [...new Set(client.messages.flatMap(m => {
    const match = m.method === 'window/logMessage' && m.params?.message?.match(/^Enabling language service for (.+)\.$/);
    return match ? [path.resolve(match[1])] : [];
  }))];
  if (!configs.includes(configFile)) throw new Error('Backend did not confirm loading the declared config');
  const candidates = [];
  for (const probe of probes) {
    const file = fileURLToPath(probe.request.textDocument.uri);
    let owner = file;
    if (file.endsWith('.html')) {
      const owners = await client.request('angular/getComponentsWithTemplateFile', { textDocument: probe.request.textDocument });
      probe.templateOwners = owners;
      if (!Array.isArray(owners) || owners.length !== 1) continue;
      owner = fileURLToPath(owners[0].uri);
    }
    if (!parsed.fileNames.includes(owner)) continue;
    candidates.push({ probe, owner });
  }
  const membership = new Map(candidates.map(c => [c.owner, []]));
  for (const config of configs) {
    const options = config === configFile ? parsed : ts.getParsedCommandLineOfConfigFile(config, {}, { ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: d => { throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n')); } });
    if (!options || options.errors.length) throw new Error(`Cannot establish query config ownership: ${config}`);
    // Official TS resolution includes transitive imports, not just include globs.
    const program = ts.createProgram({ rootNames: options.fileNames, options: options.options, projectReferences: options.projectReferences });
    for (const [owner, matches] of membership) if (program.getSourceFile(owner)) matches.push(config);
  }
  const selected = candidates.find(c => membership.get(c.owner).length === 1 && membership.get(c.owner)[0] === configFile);
  if (!selected) throw new Error('No unambiguous query consumer for the declared config; provide a config-specific probe and investigate shared owners');
  return { request: selected.probe.request, evidence: { method: 'unique-consumer-in-enabled-angular-programs',
    queryFile: path.relative(workspace, fileURLToPath(selected.probe.request.textDocument.uri)),
    owner: path.relative(workspace, selected.owner), configFile, enabledConfigs: configs,
    membership: [...membership].map(([file, configs]) => ({ file, configs })) } };
}
