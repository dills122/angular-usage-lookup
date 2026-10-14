import { fileURLToPath, pathToFileURL } from 'node:url';

// TypeScript owns symbol/alias resolution. This adapter supplies the declared config and retains native evidence.
export function startTypeScript(ts, workspace, parsed) {
  const host = {
    ...ts.sys,
    getCompilationSettings: () => parsed.options,
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: () => '0',
    getScriptSnapshot: file => { const text = ts.sys.readFile(file); return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text); },
    getCurrentDirectory: () => workspace,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    getProjectReferences: () => parsed.projectReferences,
  };
  const service = ts.createLanguageService(host);
  function sourceFile(file) {
    const source = service.getProgram()?.getSourceFile(file);
    if (!source) throw new Error(`File is not in the declared TypeScript program: ${file}`);
    return source;
  }
  function query(request) {
    const file = fileURLToPath(request.textDocument.uri);
    const source = sourceFile(file);
    return { file, offset: source.getPositionOfLineAndCharacter(request.position.line, request.position.character) };
  }
  function locations(entries) {
    return entries.map(entry => {
      const source = sourceFile(entry.fileName);
      const point = offset => { const p = source.getLineAndCharacterOfPosition(offset); return { line: p.line, character: p.character }; };
      return { uri: pathToFileURL(entry.fileName).href, range: {
        start: point(entry.textSpan.start), end: point(entry.textSpan.start + entry.textSpan.length),
      } };
    });
  }
  return {
    requireFile: sourceFile,
    definition(request) {
      const at = query(request);
      const pending = [at], seen = new Set(), chain = [], raw = [];
      while (pending.length) {
        const next = pending.shift();
        const key = `${next.file}:${next.offset}`;
        if (seen.has(key)) continue;
        if (seen.size >= 32) throw new Error('Definition alias chain exceeded 32 queries');
        seen.add(key);
        const definitions = service.getDefinitionAtPosition(next.file, next.offset) ?? [];
        chain.push({ query: next, raw: definitions });
        for (const definition of definitions) {
          if (definition.kind === 'alias') pending.push({ file: definition.fileName, offset: definition.textSpan.start });
          else raw.push(definition);
        }
      }
      return { query: at, raw, chain, locations: locations(raw) };
    },
    references(requests) {
      // A verified local alias can have uses absent from a declaration-only query (e.g. destructured import()).
      const raw = requests.map(request => {
        const at = query(request);
        return { query: at, references: service.getReferencesAtPosition(at.file, at.offset) ?? [] };
      });
      return { query: raw.map(result => result.query), raw, locations: raw.flatMap(result => locations(result.references)) };
    },
    dispose: () => service.dispose(),
  };
}
