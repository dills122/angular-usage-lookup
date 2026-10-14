# Angular 21 lookup pilot — observed results

This retains the initial pilot. The subsequent [six-library/Material extension](stress-results.md) expands coverage and records a real integration fix.

Executed 2026-10-13 after the owner explicitly requested one Angular 21 example and two Nx projects. **Both fixtures passed exact reference-set validation.** This qualifies the demonstrated component path; no production workspace or editor comparison was available. [S0, S18; see sources.md.]

## What we built

The [skill](../../skill/angular-usage-lookup/SKILL.md) owns target/scope decisions, reconciliation, classification and migration explanation. Three scripts (315 lines at validation) handle discovery, LSP lifecycle and evidence serialization. Angular's official server/service performs semantic analysis, TypeScript reads configs/class declarations, Nx supplies project discovery, and Microsoft's packages handle JSON-RPC/LSP. No custom analyzer, persistent service or MCP server was built.

Follow [the runnable instructions](../../skill/angular-usage-lookup/references/local-collection.md). From the skill directory, `npm ci` restores the lockfile and `npm test` runs the fixtures. Exact expectations are retained in [the single-project fixture](../../skill/angular-usage-lookup/tests/fixtures/angular-single/expected.json) and [the Nx fixture](../../skill/angular-usage-lookup/tests/fixtures/nx-two/expected.json). The [tests](../../skill/angular-usage-lookup/tests/lookup.test.mjs) compare both ends of every range, not only counts.

| Installed/tested tool | Version |
| --- | --- |
| Angular core/compiler/compiler-cli/language-server/service | 21.2.25 |
| TypeScript | 5.9.3 |
| Nx | 23.3.0 |
| vscode-jsonrpc / vscode-languageserver-protocol | 9.0.3 / 3.18.4 |
| Node / npm | 22.23.3 / 10.9.9 |

## Inventory

| Fixture | Unique reference spans | Declaration | Consumer spans | Template instances | Verified configs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Angular single project | 11 | 1 | 10 | 3 | 1 |
| Nx alpha + beta | 10 | 1 | 9 | 3 | 2 |

Imports, aliases and registrations are dependencies, not rendered instances. Declarations remain raw evidence but are excluded from consumers. Template instances mean static template occurrences, not runtime render counts.

Single-project sources, relative to [the fixture](../../skill/angular-usage-lookup/tests/fixtures/angular-single):

| Source | Category | Spans |
| --- | --- | ---: |
| `src/inline.ts:2` | Import | 1 |
| `src/inline.ts:5` | Standalone registration | 1 |
| `src/inline.ts:6` | Two template instances after an emoji on one line | 2 |
| `src/external.ts:2` | Imported name and local alias in one statement | 2 |
| `src/external.ts:4` | Standalone registration via alias | 1 |
| `src/different-name.html:2` | Template instance under `@if`, owner `external.ts` | 1 |
| `src/dynamic.ts:2` | Import | 1 |
| `src/dynamic.ts:5` | Direct `ViewContainerRef.createComponent` argument | 1 |

Nx sources, relative to [the fixture](../../skill/angular-usage-lookup/tests/fixtures/nx-two):

| Source | Category | Spans | Context |
| --- | --- | ---: | --- |
| `apps/alpha/src/app.ts:2` | Imported name and alias through `@lookup/ui` | 2 | alpha |
| `apps/alpha/src/app.ts:5` | Standalone registration | 1 | alpha |
| `apps/alpha/src/app.ts:6` | Templates under `@if` and `@defer` | 2 | alpha |
| `apps/beta/src/module.ts:2` | Import through `@lookup/ui` | 1 | beta |
| `apps/beta/src/module.ts:5` | NgModule import registration | 1 | beta |
| `apps/beta/src/screen.html:1` | External template instance, owner `app.ts` | 1 | beta |
| `shared/index.ts:1` | Barrel re-export | 1 | alpha + beta |

The shared declaration also retains both contexts. This is two Nx applications plus shared source behind a TS path alias, not a separately built library package.

## Skill-directed candidate reconciliation

Ran `rg -n -F` for `SuperCoolComponent`, `super-cool`, then `Cool`, over each fixture's source roots (`src` or `apps`/`shared`). Inspected surrounding code and compared candidates with semantic results:

- Both `unrelated.ts` files define another class with the same name/selector. Their templates and dependencies are excluded. A deliberate probe of that component also fails target identity qualification.
- Target class declarations and decorator selector strings describe the target; they are not consumer instances.
- Comments in `different-name.html` and `screen.html` are collateral mentions.
- `src/dynamic.ts:7` is an ordinary exported example string, with no consumer feeding it to a renderer in this closed fixture. It is collateral. The actual class argument at line 5 is a confirmed construction dependency.
- Closing markup for an existing element is not a second instance. Import aliases remain dependencies.

All expected direct fixture references were found with no false confirmed occurrences. This is a known-fixture comparison, not a production recall claim. Collection JSON stays `partial`; the reconciliation above is the skill's separate work.

## Verification

Final `npm test`: **9 passed, 0 failed**. The suite runs real LSP queries, official `ngc --noEmit` for the single project, and both Nx typecheck targets with `--skip-nx-cache`. It verifies exact UTF-16 start/end ranges, empty solution configs leading to two app configs, correct per-project contexts, and unchanged lookup source/config hashes.

Missing beta configuration returns failed partial collection while preserving alpha evidence. An incorrect same-selector probe cannot verify its config. An initialization timeout reports a failure and cleanup evidence. Successful and timed-out child PIDs are checked to have exited. An output symlink into the workspace is rejected. Nx cache files are permitted and ignored.

Raw responses, definition probes, config-load logs, versions, hashes and process metadata are regenerated in ignored `test-output/angular-single.json` and `test-output/nx-two.json`. Absolute paths/PIDs/timestamps are local run evidence; fixtures, expected sets and tests are the portable retained evidence.

## Review and dependency check

Applied code-review-and-quality as a local author review; no independent review is claimed. Corrected missing initialization cleanup metadata, output symlink handling and a misleading uninstalled build target in the minimal Angular fixture. The fixture is for lookup/typechecking; no browser or production application build was attempted.

Nx 23.3.0 initially produced two affected-package entries via Undici. npm's proposed Nx 23.2.1 downgrade exposed four other affected packages. The final fixture retains Nx 23.3.0 with a scoped Undici **7.29.1** override. Final `npm audit --json` exited 0 with **zero known vulnerabilities** at execution; this is an advisory check, not a security guarantee. Inspected direct Angular/Nx/Microsoft tooling packages declare MIT licenses. [S18]

## Limits and next step

No supplied production workspace, editor baseline, large-monorepo performance run or other version combination was tested. The [broader matrix](../../skill/angular-usage-lookup/references/acceptance-cases.md) still includes unqualified complex selectors, directives/pipes/member APIs, separate story/test configs, shared-template owners, built-library declarations and indirect runtime flow.

Discovery and collection are separate skill-orchestrated commands. The manifest explicitly selects configs and known template probes. The helper cannot certify zero usages or automatically establish whole-monorepo coverage. Next: qualify the component path on one supplied Angular 21 workspace, then add an attribute directive and an aliased API based on observed needs.
