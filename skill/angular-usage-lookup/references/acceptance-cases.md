# Qualifying a backend

This is the broader qualification matrix. The [local pilot](local-collection.md) has passed the component subset below; remaining rows still require testing. Use a disposable fixture or known consumers in a supplied workspace, record exact versions, and define expected locations before scanning.

| Case | Required behavior |
| --- | --- |
| Class queried; inline and external template | Both instances and TS dependencies found; declaration excluded from consumers |
| HTML owned by differently named TS file | Owner resolved from metadata |
| Duplicate class names / selectors in separate scopes | Unrelated targets excluded |
| Aliased import, barrel, TS path alias | Exact declaration identity retained |
| Element/attribute/class, compound/comma/negated selectors | Correct matches, negative cases rejected |
| Standalone and NgModule consumers across apps/libs | Every leaf config covered, independent of initially open project |
| Empty solution config; separate test/story configs; built library `.d.ts` | Leaf configs and identity mapping verified or gaps reported |
| `@if`, `@for`, `@defer`, structural shorthand, `ng-template` | Nested supported usages found |
| Input/output aliases, `model()`, inherited/exposed host API | Binding owner/public name retained; ambiguity not guessed |
| Routes, lazy load, direct creation, dialogs, registry-to-outlet | Direct references and indirect flow distinguished |
| Host directives / wrappers | Composition captured; wrapper callers not direct instances |
| Comments, docs, CSS, HTML strings, harness selectors | Collateral/candidate/rejected records separated from instances |
| Two uses on one line; emoji before inline template; CRLF | Correct source locations and count |
| Shared template with different owners | Separate resolution contexts retained |
| Missing dependency, unassociated template, server failure, truncated result | Partial/blocked, never a clean zero-use conclusion |
| Suspicious omission, uncertain flow or metadata queued as `peculiar` | Every item investigated before final reporting; evidence-backed outcome and corrected inventory or explicit remaining gap, with no duplicate usage count |

Pass requires every expected direct usage in the agreed supported fixture, no false confirmed usages, and explicit gaps/candidates for deliberately unsupported cases. This measures the fixture only, not universal recall.

Repeat cold-start and project-switching cases to expose stale associations. An Nx pilot needs a second independently configured app. Compare source-location sets against the expected inventory, not another tool's headline count.

## Executed component subset — 2026-10-13

`npm test` runs real Angular 21.2.25 LSP processes, the compiler and the Nx 23.3.0 CLI. Exact expected start/end ranges are in each fixture's `expected.json`, independently authored before collection. Passed: inline/external templates including a differently named owner, import alias/barrel/path alias, unrelated identical class/selector, standalone and NgModule consumers, empty solution configs leading to two app configs, `@if`/`@defer`, direct `createComponent`, repeated same-line uses and UTF-16 emoji offsets. Shared source references merge both project contexts. Missing config, wrong-identity probe and initialization timeout produce failed partial collection; children exit and lookup source/config hashes stay unchanged. A report-output symlink into the workspace is rejected.

The initial two-app fixture uses shared source, not a separately built library. The extension below adds configured libraries and structural shorthand.

## Executed six-library/Material extension — 2026-10-13

`nx-stress` contains six libraries (`ui`, `shared`, `legacy`, `modern`, `dialogs`, `reporting`) and two apps. All eight independent configs compile and Nx discovers the full set. Exact expected ranges and project contexts pass: **26 card references including 16 template occurrences**, and **18 dialog references across six consumer programs**. The dialog has no template usage; the explicit TypeScript backend qualifies it.

Exercised: `*ngIf` with else, `*ngFor` both on the target and an enclosing container, `[ngIf]` on `ng-template`, `ngSwitchCase`/default, module declarations/imports/re-exports, standalone consuming modules and modules consuming standalone components, renamed barrel exports and `ViewChild`, lazy dialog imports, direct/aliased `MatDialog.open` calls. Expected locations predate execution; the old Angular-only dialog qualification failed before the TS adapter was added.

Separate skill-directed TS reference queries validate alias/property/method caller locations for indirect dialog paths. Variable-key registry selection stays unresolved. Wrong-class probes and a target absent from a TS program fail. Template coverage gaps remain on TS-only rows. Full suite: **14 passing tests**.

At that stage, selectors beyond elements, pipes/members, `@for`, shared-template owners, CRLF, routes, built-library mappings, separate test/story configs and larger performance remained unqualified. The extensions below qualify a bounded subset. This tests old coding patterns on Angular 21.2.25, not old Angular releases or browser rendering.

## Config routing and bounded APIs — 2026-10-13

The current normal suite passes **29 tests**. A disjoint app/spec regression compares all 14 exact spans: app-only references cannot replace spec-only references under an equal count. A shared probe, foreign-project probe, missing positive probe and multiply owned external template fail with coverage gaps. Fresh servers alone did not prevent the original default-project bug; the collector now uses a uniquely owned consumer query and retains membership evidence from the enabled Angular programs.

The `api-shapes` fixture compiles with Angular and runs six queries covering attribute selectors, element/attribute combinations, comma alternatives, `:not([disabled])`, host directives, a pipe's `transform` method, and aliased input/output members re-exposed by a host directive. All **11 expected template/API associations** are recovered and the known disabled-selector negative is rejected. These assertions use token containment in native spans, not the exact-range/complete-reference-set oracle used by the component scale test; do not combine the denominators. A pipe template token resolves to the method, so a class/import query and a transform/template query serve different parts of its inventory. Missing/ambiguous declared members fail instead of falling back to the class.

Host directive class references can include the wrapper's opening element. Classify that as composition impact using metadata/source; do not assume a direct selector occurrence from the generic helper result. At this stage inherited declarations, `model()`, two-way APIs and overloaded members remained unqualified; the rendering gauntlet below adds a bounded signal/model/two-way case.

## Peculiar review workflow checks

When evaluating the skill's final reconciliation, use the existing stress cases to check behavior: a class-only lazy-binding omission should become a verified recovered miss after the binding query; an unrelated same-name dialog should be explained using declaration identity; a repeated view of the same opening should link the existing occurrence; and `DIALOGS[key]` should remain unresolved if the selected runtime key cannot be established. No queued item may disappear, become confirmed without evidence or inflate occurrence counts. Retain the checks and outcomes in the report ledger. These are skill behavior criteria, not new collector capabilities or claims of an automated agent evaluation.

## Generated 54-library/three-app qualification

`npm run test:scale` generates 561 TS and 27 HTML files across 54 libraries and three applications, freezes an independent source-location/config oracle, discovers all projects and compiles 63 leaf configs. The card target has 489 exact spans and 8,015 config pairs; the dialog target has 114 spans and 2,184 pairs across 61 declared programs, with UI/shared explicitly outside its dependency scope. All match; per-pattern assertions prevent repeated auxiliary templates from concealing failures. Generated test/story configs exercise Angular program overlap, not actual Jest/Storybook runtimes. Reports remain partial pending skill reconciliation.

The binding-collision regression adds a harder negative: multiple returned definitions must all identify the target. An ambiguous public binding fails closed; a uniquely resolved consumer returns exactly the target member declaration and two uses, excluding the unrelated member.

Still unqualified: built package/source identity, real test/story integrations, shared-template per-owner backend routing, inherited/model/two-way/overloaded APIs beyond the explicit fixtures, arbitrary runtime selection, remote/federated consumers, other Angular versions, larger source-file counts and peak memory. Synthetic helper accuracy is not a 95% production or human-helpfulness score. See the [large-workspace runbook](large-workspaces.md) for scope accounting and reproduction.

## Rendering gauntlet — 2026-10-13

`npm run test:gauntlet` adds a strict single-program fixture using the official matching router. It covers lazy components/route arrays/NgModules, nested/named outlets, 48 nested views, all legacy/modern branch forms, recursive/unused/contextual templates, projection/fallback, structural directives, dynamic component/factory paths, module-backed outlets, CDK portals and Material component/template openers. It compiles real APIs and checks exact locations; it does not execute browser rendering or navigation.

Final reconciled inventory: **109 exact locations including 47 template occurrences**, zero unexplained missing/extra locations. Raw providers return 103 locations: the skill recovers seven references to renamed lazy local symbols and rejects one inactive non-bindable descendant. The original class-identity guard remains strict. The active host carrying `ngNonBindable` is retained. This tests reconciliation, not perfect raw-provider precision/recall.

Seven Angular member queries check 16 exact locations including signal input/output aliases, one `model()` two-way binding and outlet fields. Seven TS follow-ups check 18 locations; 11 resolved method signatures distinguish Material calls from a local lookalike; 12 authored source relationships cover paths lacking class tokens and fragment display sites. Those denominators are different and must not be summed into a usage count.

Runtime registry keys and conditional route choices remain unresolved. The [rendering runbook](rendering-paths.md) records the required skill follow-ups. Source hashes, exact config contexts and process cleanup pass. The fixture author supplies the follow-up strategy; this is not a blind evaluation of an agent's investigation accuracy.
