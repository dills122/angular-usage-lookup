# Runnable Angular 21 lookup

Angular owns references, template scopes and source mapping. TypeScript handles TS-only references and checks query-file membership in loaded programs. Local helpers own configuration inventory, backend lifecycle, query qualification and evidence serialization. Microsoft `vscode-jsonrpc` and `vscode-languageserver-protocol` handle protocol transport/types. Reference collection does not use a custom compiler analyzer. The separate optional [Material catalog generator](material-catalog.md) uses a pinned Angular internal metadata reader for package identities and family configs.

## Reproduce the fixtures

From this skill's root directory, with Node 22.12+ in the 22.x line (tested: 22.23.3) and npm:

```sh
npm ci
npm test
npm run test:gauntlet
```

Install only in this isolated skill directory when setup is authorized. Do not run `npm install` inside the fixtures: they intentionally resolve dependencies from their parent tooling package. The original Mac qualification used Node 22.23.3. Node 24 is allowed by the manifest and selected by the repository’s current `.nvmrc` for hosted CI; check the [CI run](https://github.com/dills122/angular-usage-lookup/actions/workflows/ci.yml) for the exact tested revision, operating system and runtime.

The lockfile pins Angular core/compiler/compiler-cli/language-server/service **21.2.25**, TypeScript **5.9.3**, Nx **23.3.0**, JSON-RPC **9.0.3** and LSP protocol **3.18.4**. The fixture's Nx dependency overrides Undici to **7.29.1** because its original pin triggered npm advisories. This affects only the helper's dev tooling, not any scanned workspace. Reassess the override on dependency updates.

The test suite compiles fixtures with official `ngc --noEmit` and real Nx `typecheck` targets with caching bypassed, and performs Angular LSP/TypeScript queries. The expanded `nx-stress` fixture uses Angular Material/CDK **21.2.14**, six libraries and two apps, legacy structural syntax, mixed scopes and dialog opening from code. These are minimal lookup/typecheck fixtures, not browser applications or an Angular CLI production-build example.

The separate rendering gauntlet adds the matching official `@angular/router` **21.2.25** dev dependency. It compiles and emits into ignored test output to inspect a non-bindable compiler counterexample. It exercises lazy routes/NgModules, 48 nested views, recursive/unused fragments, deferred branches, dynamic component/template/portal paths and signal bindings. See [rendering paths](rendering-paths.md) for the source-backed follow-up workflow and its runtime limits.

```sh
node scripts/discover.mjs --workspace tests/fixtures/angular-single
node scripts/discover.mjs --workspace tests/fixtures/nx-two
node scripts/discover.mjs --workspace tests/fixtures/nx-stress
node scripts/collect-references.mjs --workspace tests/fixtures/nx-stress --manifest lookup-card.json --output test-output/nx-stress-card.json
node scripts/collect-references.mjs --workspace tests/fixtures/nx-stress --manifest lookup-dialog.json --output test-output/nx-stress-dialog.json
node scripts/collect-references.mjs --workspace tests/fixtures/angular-single --manifest lookup.json --output test-output/angular-single.json
node scripts/collect-references.mjs --workspace tests/fixtures/nx-two --manifest lookup.json --output test-output/nx-two.json
```

`npm test` creates the ignored `test-output` directory and the JSON reports, including `nx-stress-card.json`, `nx-stress-dialog.json` and `nx-stress-flows.json`. If running collection before tests, create that output directory first. Omitting `--output` writes JSON to stdout. Output paths are relative to the caller's current directory, must be outside the scanned workspace, and must not be symlinks. Nx may create `.nx` cache data; application source/config contents remain unchanged.

## Use with a supplied workspace

1. Run discovery against its absolute root. This resolves its installed Nx CLI, calls `show projects --json` and `show project NAME --json`, and uses TypeScript's config APIs. Without `nx.json`, it reads `angular.json`. It examines target `tsConfig` paths, project-root `tsconfig*.json` files and project references. Retain the inventory, including targets and gaps.
2. Review the inventory for custom executors, file replacements, nonstandard paths, story/test consumers and package boundaries. Discovery does not prove these are covered. A config with no roots can be a solution; follow its references. Do not discard failed discovery or configs with no proven target usage.
3. Resolve the target class declaration and prepare a manifest like the fixtures. Keep the manifest/report outside the application when practical; `--manifest` accepts an absolute path. Config/source paths below are relative to the workspace.

```json
{
  "target": { "file": "shared/super-cool.ts", "symbol": "SuperCoolComponent" },
  "projects": [{
    "name": "beta",
    "tsconfig": "apps/beta/tsconfig.app.json",
    "anchor": { "file": "apps/beta/src/app.ts" },
    "probes": [{
      "file": "apps/beta/src/screen.html",
      "owner": "apps/beta/src/app.ts",
      "text": "super-cool",
      "occurrence": 0
    }]
  }]
}
```

The anchor is a TS root file of the declared leaf config. Each Angular-backend config needs a known consumer probe; prefer a **known real template usage**. For a package class, a TS import probe can disambiguate a selector that also names an input. When Angular returns no TS definition, the helper uses the same config's TypeScript service for identity only, retaining `angularDefinitions`, `definitionBackend` and the definition chain. It never substitutes for a nonempty ambiguous Angular response. A TS probe alone does not prove template coverage; verify known template candidates and inspect the actual results. `text` locates a literal substring; `occurrence` is zero-based and defaults to zero; optional `offset` points inside that substring in UTF-16 units. For inline markup, `text: "<super-cool", offset: 1` queries the tag. The external template's `owner` comes from component metadata, not guessed matching basenames. Every returned probe definition must resolve to the exact requested declaration; mixed-target definitions fail identity qualification.

For an API, add `"member": "strength"` to the target and use a real public binding probe. The member must be exactly one explicitly declared identifier in that class; resolve inherited declarations and overloads separately. Angular resolves a pipe template token to its `transform` method: query `{ "file": "src/types.ts", "symbol": "FormatPipe", "member": "transform" }` for template uses, and query the class with `backend: "typescript"` through a verified TS consumer for imports/registrations. Preserve both as distinct dependency/API queries. A public alias does not change the declaring TS member name. The API fixture exercises aliased inputs/outputs re-exposed by a host directive; it does not qualify every inherited/model/two-way API.

4. Run collection. The helper resolves TypeScript/core from the scanned workspace and prefers workspace server/service packages, falling back to the helper installation only when absent. Exact qualified profiles are Angular/TypeScript/server 20.3.33/5.9.3/20.3.0, 21.2.25/5.9.3/21.2.25, and 22.2.2/6.0.3/22.2.2, each with service matching core. It checks actual server startup version logs. It refuses other combinations rather than upgrading the workspace. Each Angular-backend config gets a fresh server, synchronized root files, identity probes, a qualified consumer reference query and shutdown. Probe owners must be root files of the declared config. An external query needs exactly one owner returned by Angular. The selected query owner must belong to exactly one enabled Angular program, verified with TypeScript's program APIs including transitive imports; membership is rechecked after the reference request. Otherwise the row fails with an ownership gap. Both the qualified servers’ enabled-config log and Angular's template-owner request are version-specific integration assumptions; requalify on server changes. This conservative check may reject a valid shared probe; supply a config-specific consumer or investigate separately.
5. Compare discovery against the manifest and returned coverage. They are deliberately separate stages; the helper does **not** automatically include every discovered project/config. Unlisted scope stays a gap unless explicitly excluded. `result: verified` means the collection checks passed, not that all Angular syntax/dynamic paths were tested.
6. Read nearby source, classify imports/registrations/template instances/dynamic references and run the skill's candidate sweep with actual class, selector and alias names. Preserve collateral, rejected matches and unresolved cases. Add migration guidance only when supported by source/API evidence.

## Verify template candidates and recover reference omissions

Angular 21's reference query can omit templates for generic components and
directives, including Material options, datepickers and tables. Exact template
definitions can still resolve correctly. Do not interpret a successful query or
an import-only result as evidence that these templates are unused.

After the source candidate sweep, add explicit `candidates` to the corresponding
manifest project and run collection again. They use the same anchor format:

```json
"candidates": [
  { "file": "src/page.html", "owner": "src/page.ts", "text": "<mat-option", "offset": 1 },
  { "file": "src/page.html", "owner": "src/page.ts", "text": "matEndDate" }
]
```

This is an optional, bounded list supplied by the skill, not an automatic text
scan. Use selector attribute tokens for attribute directives; a native tag such
as `input` may resolve to DOM declarations. Candidates require the Angular
backend, root-file ownership and a uniquely owned query in the declared config.
`candidateEvidence` retains native definitions, source origins and config proof:

- `confirmed`: definitions identify the exact target and have source origins
  containing the candidate anchor. A class selector that also names an input can
  return the class plus its own setter/property: `target-and-declared-members`
  requires an exact class destination and exact AST identifier positions for
  every additional directly declared member. Inherited/foreign members and
  member-target queries do not receive this exception. `presentInReferences: false` records
  an omission recovered by separate definition evidence.
- `rejected`: returned definitions identify other declarations.
- `unresolved`: definitions are absent or ambiguous, or ownership/source mapping
  cannot be verified. A `candidate-unresolved` gap remains in the partial report.

The raw `references` array is unchanged. Reconcile candidate evidence into the
final skill inventory, retaining the raw omission in the peculiar ledger. Native
definition origins can span a whole element or only its selector attribute;
they are not replacement reference ranges or safe edit spans. Deduplicate the
same occurrence across evidence kinds and preserve unknown candidates.

### Explicit compiler association fallback

When default candidate definitions are absent or mixed, preserve that report and
submit the same anchors with `backend: "angular-compiler"`. This optional backend
requires workspace `@angular/compiler` and `@angular/compiler-cli` **21.2.25**.
It uses `NgtscProgram` and Angular's template type checker, with the internal
`_enableTemplateTypeChecker` option covered by exact-version regression tests.
It performs no emit or application edits.

`compilerEvidence` retains the component owner, native opening-node source span
and Angular's directive references/match sources. Confirmation requires the
exact target declaration file and identifier offset with a direct selector match.
An indirect host directive, foreign same-named class, ordinary string, comment,
ambiguous owner or member target is not confirmed. The record describes a direct
association on that element/template node; it is not an API-binding reference or
proof of runtime instantiation. Compiler evidence does not alter `references`.

The full Material qualification compiles all 182 public component/directive
classes from the pinned inventory (180 have concrete selectors; two are abstract),
covering every selector alternative in inline, external, `@if`, `@for` and `@defer`
contexts. It preserves raw misses separately from default-definition and compiler
recovery. It does not test every input/output combination or browser interaction.


## Dialog-only and other TypeScript consumers

Set `"backend": "typescript"` on a manifest project to use the workspace's public TypeScript language service. Keep `anchor.file` in the declared config's root files; a probe can be an imported transitive source file in that same program. Do not add the target to the program artificially: absent targets/probes fail qualification.

For example, the dialogs library uses this project entry with target `libs/dialogs/src/dialog.ts`, class `CoolDialogComponent`:

```json
{
  "name": "dialogs",
  "tsconfig": "libs/dialogs/tsconfig.lib.json",
  "backend": "typescript",
  "anchor": { "file": "libs/dialogs/src/dialog.ts" },
  "probes": [{ "file": "libs/dialogs/src/launcher.ts", "text": "CoolDialogComponent" }]
}
```

Definition lookup follows TypeScript-reported alias hops (bounded to 32 queries with cycle detection), retaining the chain until the exact class is reached. Collection queries both the class declaration and verified probes. This matters for destructured `await import(...)`: the class query can return the binding while omitting later local-variable uses. The stress manifest adds that binding as a probe in each program containing it. A **renamed** destructured binding can instead resolve to a distinct local variable; verify the imported property against the target and query that variable separately, preserving its source relationship. Never relax exact-target qualification. The helper does not automatically find or follow every alias/dataflow path.

The TS backend emits native TypeScript evidence and `capabilities: ["typescript-references"]`. It always adds a template gap. No Angular server is started for that row. Calls are synchronous in the collector process; `--timeout-ms` applies to LSP, not TS work. Set a command/process timeout when running against a large workspace.

Then use the skill to inspect actual `MatDialog.open` arguments. `tests/stress.test.mjs` demonstrates separate ordinary TypeScript reference queries for `DialogAlias`, the `cool` property, `openDirect`, and `openAny`. These reveal caller locations, not an automatic proof of runtime selection. A wrapper also called with `OtherDialog` must retain that distinction; `DIALOGS[key]` remains a candidate. The fixtures' source/expected files and generated flow evidence make these manual chains reviewable.

## Failures and limits

- Exit **0**: the declared collection succeeded; report still says `partial` pending reconciliation. Discovery exit 0 is only a config inventory success.
- Exit **2**: one or more project/config checks failed; JSON preserves gaps and successful project evidence. Discovery uses 2 for missing/unreadable configs.
- Exit **1**: setup, argument, dependency, target or output failure; stderr explains it. No successful report is implied.
- `--timeout-ms N` bounds each LSP request (default 15000, max 300000); shutdown is separately bounded. Initialization failures preserve child cleanup evidence.
- This collector accepts a top-level class and optionally one explicitly declared identifier member, with preselected backend-appropriate probes. It cannot certify an unused component; report that capability gap and use the broader skill workflow.
- Missing/wrong template association, source/package `.d.ts` identity differences, mismatched versions or inability to prove the declared config are failures to resolve, never evidence of zero usages.
- Opening all root files is qualified against the generated 54- and 102-library/three-app workloads. Nested layouts, custom project associations and real-workspace resource use still need a supplied-repository pilot. See [large workspaces](large-workspaces.md) for scope accounting and the separate scale command.
- Raw LSP ranges may cover an entire opening element. Keep them as evidence, not replacement/edit spans. Coordinates are one-based UTF-16, end-exclusive in normalized references; raw provider evidence stays zero-based.

For exact exercised and untested cases, use [acceptance cases](acceptance-cases.md). The skill remains responsible for the final [usage report](report-contract.md).
