# Tool routing and backend qualification

Reuse a compatible existing connection. A [local collector](local-collection.md) is qualified on the bundled component fixtures using official Angular 21.2.25, Microsoft's protocol libraries and Nx 23.3.0. Its explicit TypeScript backend uses the workspace language service for TS-only references such as dialogs. No custom MCP service is required. The isolated tooling package is installed separately from scanned application dependencies.

## Preferred semantic path

Use official `@angular/language-server` (LSP transport) backed by `@angular/language-service`, through an editor or a demonstrated LSP-to-MCP bridge. The server delegates references to `getReferencesAtPosition`. The service generates template type-check blocks and maps references into source; upstream tests cover component-class-to-template lookup. This is source evidence, not a guarantee about every release/configuration. [Service](https://angular.dev/tools/language-service), [server](https://github.com/angular/vscode-ng-language-service/blob/main/server/src/session.ts), [implementation](https://github.com/angular/angular/blob/main/packages/language-service/src/references_and_rename.ts), [tests](https://github.com/angular/angular/blob/main/packages/language-service/test/references_and_rename_spec.ts).

Required capabilities:

- Angular-aware definition/references at exact positions, with raw results available.
- Document synchronization for TS/HTML; open the metadata-identified owner component before querying external HTML, even if basenames differ.
- Visible project state/diagnostics and a known-reference probe. Use real connection capabilities, not a fabricated generic readiness call.
- Verifiable coverage of required leaf configurations. A solution tsconfig can contain no source files; a shared file can select only one default project.
- Source ranges, encoding and backend identity retained.

For an existing raw LSP client, use `textDocument/references` with `textDocument.uri`, position on the declaration identifier, and `context.includeDeclaration: false`. First initialize the workspace, send `initialized`, synchronize needed documents and wait for project analysis. Probe `textDocument/definition` at a known template usage. These are protocol operations, not shell commands. Do not invent MCP method names or send LSP to tsserver's different protocol.

Angular documents `ngserver --stdio` with `--tsProbeLocations` and `--ngProbeLocations`. Resolve paths from installed packages and inspect that release's help. Align service/compiler versions with the workspace and TypeScript with Angular's [compatibility range](https://angular.dev/reference/versions). Record relevant compiler options including `strictTemplates`; do not rewrite configs to satisfy a diagnostic suggestion.

With editor-only access, use Angular Find References/Go to Definition, capture locations, and apply the same coverage procedure. Opening a repository root does not prove all its Nx projects were analyzed.

## Workspace discovery

Inspect manifests/lockfiles and use installed local binaries. From the verified workspace root, when supported:

```sh
./node_modules/.bin/nx show projects --json
./node_modules/.bin/nx show project actual-project-name --json
```

Replace the example name with each returned project. With PnP or another layout, use its local executable resolution. If discovery fails, inspect configs and report possibly missing plugin-inferred projects/targets. Tool caches may be created; application/configuration mutation is outside lookup scope. Do not use `--affected` as an all-usage boundary. Inspect build/test/story targets, extends/references, file replacements and path mappings. [Nx commands](https://nx.dev/docs/reference/nx-commands).

For Angular CLI workspaces, inspect `angular.json` and referenced configs. Angular CLI MCP's documented `list_projects` reads `angular.json`; do not assume it enumerates Nx inferred projects. Its documented tool list has no general reference lookup. [Angular 21 MCP](https://v21.angular.dev/ai/mcp).

Nx MCP is optional: current minimal mode hides workspace-analysis tools in favor of skills/CLI workflows. Inspect advertised tools instead of assuming older names exist. Project graphs aid navigation, not template-symbol resolution. [Nx MCP](https://nx.dev/docs/reference/nx-mcp).

## Fallbacks and integration choices

| Capability | Useful for | Limit |
| --- | --- | --- |
| Angular-aware editor/LSP | Template and code references | Must establish config coverage |
| TypeScript LS / existing ts-morph wrapper | Class/member/import references in TS | Does not interpret Angular templates by itself |
| `rg`, ast-grep, graph/MCP index | Candidates, collateral and discrepancies | No automatic proof of Angular binding |
| Angular parser / selector matcher | Syntax and selector candidates | Scope/symbol resolution still needed |
| Compiler `TemplateTypeChecker` adapter | Possible future deterministic resolution | Internal API/version maintenance; outside default scope |

[ts-morph references](https://ts-morph.com/navigation/finding-references) wrap TS analysis. [Compiler source](https://github.com/angular/angular/blob/main/packages/compiler-cli/src/ngtsc/typecheck/api/checker.ts) offers `getTemplate`, `getSymbolOfNode`, `getDirectivesOfNode` and `getUsedDirectives`. An aggregated used-directives list does not provide every occurrence's location. Prefer an existing qualified backend before building an adapter.

For an agent lacking LSP access, discuss existing bridges before writing one:

- [mcp-language-server](https://github.com/isaacphi/mcp-language-server) exposes definition/references and forwards arguments to a stdio server. Its tested-server list does not establish Angular support; the Angular pairing needs a pilot.
- [cclsp](https://github.com/ktnyt/cclsp) offers name-based reference lookup and configurable servers. Validate template positions, symbol discovery and server routing; a TypeScript example does not prove Angular support.

Neither is a required or validated dependency. Adopt only after the acceptance cases demonstrate Angular coverage and explicit failure reporting. Do not install both by default.

A fallback candidate sweep can start with:

```sh
rg -n -F -e 'SuperCoolComponent' -e 'actual-selector' -- verified-source-root
```

Replace example values with resolved names and roots; expand compound selectors into candidate tokens. Record ignore/hidden-file policy and include tests/stories/styles as scoped. No lexical matches does not mean no Angular usages. Retain commands and failures in the report.
