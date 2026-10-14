# Six-library and Material dialog qualification

Executed 2026-10-13 at the owner's request. **The expanded test passed after fixing a real TS-only lookup gap.** Angular 21.2.25, Material/CDK 21.2.14, TypeScript 5.9.3 and Nx 23.3.0 were used. This tests legacy coding patterns on Angular 21, not old Angular releases. [S19, S20; see sources.md.]

## Workspace and oracle

The [fixture](../../skill/angular-usage-lookup/tests/fixtures/nx-stress) contains six independently configured Nx libraries and two apps. This is a monorepo-shaped integration test, not a production-scale benchmark or a built-library packaging test.

| Project | Role and stress case |
| --- | --- |
| ui | NgModule-declared `SuperCoolComponent`, exports and its own consumer config |
| shared | Module re-export, switch templates, standalone component imported/exported by a module, renamed class export |
| legacy | NgModule feature, external template, structural directives, lazy dialog import |
| modern | Standalone feature importing modules, old/new control flow together, `ViewChild` through a renamed barrel |
| dialogs | Real Material dialog component and injectable launcher; no template usage of the dialog itself |
| reporting | Standalone consumer, renamed dialog import and a wrapper also used for another dialog |
| storefront | Standalone app, direct dialog opening and a service caller |
| admin | Module app importing standalone features; fixed registry property and unrelated same-name/selector negatives |

Expected reference locations and contexts were authored **before collection** in [expected-card.json](../../skill/angular-usage-lookup/tests/fixtures/nx-stress/expected-card.json) and [expected-dialog.json](../../skill/angular-usage-lookup/tests/fixtures/nx-stress/expected-dialog.json). The collector output did not generate the oracle. [Follow-up expectations](../../skill/angular-usage-lookup/tests/fixtures/nx-stress/expected-flows.json) cover alias/property/method queries. The [stress tests](../../skill/angular-usage-lookup/tests/stress.test.mjs) compare every start/end range and project context.

## Observed results

| Query | Reference spans | Template occurrences | Configs | Result |
| --- | ---: | ---: | ---: | --- |
| SuperCoolComponent | 26 | 16 | 8 | Exact locations and contexts passed without changing the Angular lookup engine |
| CoolDialogComponent | 18 | 0 | 6 | Passed using explicit TypeScript service and verified alias queries |

The card result contains one declaration and 25 other spans. The dialog result contains one declaration, one internal `MatDialogRef<CoolDialogComponent>` type reference and 16 external dependency/call-argument spans. None of these totals is a runtime rendering count.

All eight configs compile through official `ngc --noEmit`, run by real Nx targets with cache bypassed. Nx discovers all six libraries and both apps. Full regression suite: **14 tests passed, 0 failed**; final npm audit reported zero known vulnerabilities. The dependency additions are isolated fixture devDependencies.

The 16 card template occurrences cover `*ngIf` on the target, else branches, nested containers, `*ngFor` on both containers and target elements, `[ngIf]` on `ng-template`, `ngSwitchCase`/default, and mixed `@if`/`@defer`. NgModule/standalone boundaries, shared barrels and renamed query symbols preserve the expected project contexts.

## What the harder test caught

1. **The original collector could not qualify a dialog used only from TypeScript.** All six dialog consumer configs failed the Angular template-oriented definition probe. We retained the failure before adding the TypeScript adapter. No artificial template use was added to the fixture.
2. **A lazy destructured import stopped definition lookup at a barrel alias.** The adapter now follows TypeScript's reported alias definitions to the exact class, preserving every hop with a 32-query/cycle bound.
3. **A class-only reference query omitted the later use of that local destructured binding.** Querying references at the verified binding recovers the call argument. The skill explicitly adds that probe in every relevant program; the helper does not discover arbitrary dataflow automatically.
4. **Method callers are program-scoped.** An initial follow-up query in the admin program could not see the storefront caller. Repeating it in the storefront config found it. The expected location stayed in the oracle; the query scope was corrected.

The new adapter uses public `ts.createLanguageService`, `getDefinitionAtPosition` and `getReferencesAtPosition`. It reads the declared config and never injects the target into a program. Wrong-class probes and absent targets fail rather than returning a trusted empty inventory. TS-only coverage rows retain a template gap; the main report stays partial.

## Material dialog inventory and follow-up evidence

Paths below are relative to the fixture. Source review plus ordinary TypeScript reference queries produced these chains:

| Location | Evidence and classification |
| --- | --- |
| `libs/dialogs/src/launcher.ts:9` | Confirmed direct `MatDialog.open(CoolDialogComponent)` |
| `libs/legacy/src/page.ts:8` | Confirmed lazy-import binding followed to its `open` argument |
| `libs/reporting/src/report.ts:10` | Confirmed `open(DetailsDialog)` through a renamed import |
| `apps/storefront/src/app.ts:13` | Confirmed direct opening |
| `apps/admin/src/app.ts:8` | Confirmed opening through `AdminDialog` import alias |
| `libs/dialogs/src/launcher.ts:10` | Skill-confirmed path through `DialogAlias`, initialized to the target at line 4; separate alias reference query finds the use |
| `apps/admin/src/app.ts:9` | Skill-confirmed fixed property `DIALOGS.cool`, initialized to the target at launcher line 5; property reference query finds the access |
| `libs/reporting/src/report.ts:11 → :13` | Target-specific invocation `openAny(DetailsDialog)` reaches the generic open body; the same body also receives OtherDialog at line 12 |
| `apps/storefront/src/app.ts:14 → launcher.ts:9` | Skill-confirmed caller of the target-specific service method, established by method reference lookup |
| `libs/dialogs/src/launcher.ts:11` | **Candidate:** `DIALOGS[key]` can select the target or OtherDialog; no particular runtime selection is established |

The first five opening sites appear in the semantic inventory. The next four are reviewed indirect paths, not four additional automatically discovered class references or four necessarily distinct runtime renderers. Wrapper/service entry points can reach an opening site already counted. These distinctions remain visible in the skill instructions.

`openOther` and the separate `apps/admin/src/unrelated.ts` dialog are not target usages. The latter deliberately has the same class/selector names; both class-query paths reject it. A wrong-class TS probe is also tested explicitly.

## Reconciliation and reproducibility

Swept all `libs` and `apps` source roots for real class/export/import aliases, selectors, `dialog.open`, registry and wrapper names using `rg -n -F`, then inspected their surrounding source. The legacy HTML comment and unrelated example string are collateral. Target declarations/selector metadata are not consumers. The unrelated component/dialog scope remains excluded. No additional unexplained textual candidate was promoted to a confirmed target.

From the [skill package](../../skill/angular-usage-lookup/SKILL.md), run `npm ci` then `npm test`. For only this fixture, use `node --test tests/stress.test.mjs`. The [runbook](../../skill/angular-usage-lookup/references/local-collection.md) documents discovery and both collector commands.

Ignored `test-output` retains generated discovery, compiler output, card/dialog references, definition chains, candidate sweep and follow-up query evidence. Portable evidence is the source, independent expectations, lockfile and tests. Source/config hashes remain unchanged during collection; Angular child PIDs exit and TS services are disposed.

## Review and remaining limits

Local author review checked backend labeling, native evidence preservation, bounded alias navigation, config membership and cleanup. No independent reviewer or browser runtime check is claimed. Actual Material APIs were compiled; dialogs were not opened in a browser.

This fixture does not qualify old Angular versions, general runtime dataflow, remote modules, built-library `.d.ts` mapping, shared-template owners, separate test/story configs, member migrations or production-scale performance. Selection of configs and alias probes is still skill-directed. TS queries are synchronous and need an outer command timeout for large workspaces.

Next: try the qualified workflow on a supplied real repository, especially built library boundaries and additional test/story configs. The evidence supports retaining a skill plus small existing-tool adapters; it does not justify a custom analysis engine.

## Peculiar review walkthrough — 2026-10-13

The owner requested an explicit internal queue and an investigation pass before final reporting. The following applies the new [ledger](../../skill/angular-usage-lookup/references/report-contract.md#peculiar-review-ledger) to this fixture's existing evidence. Source and retained successful collection output were re-read; the prior failure history above supplies the initial observations. This is an author walkthrough of known cases, not a new backend run or independent agent evaluation.

| ID / original question | Investigation and evidence | Outcome / report treatment |
| --- | --- | --- |
| P1: Why did the class-only query omit the lazy call argument? | Inspect `libs/legacy/src/page.ts:8`, the verified binding probes in `lookup-dialog.json`, and the retained report's separate binding/call spans with their config contexts. The earlier binding query recovered the later use. | `recovered-miss`: an initial reference-query omission, recovered in the earlier run. Keep the existing confirmed call argument and definition chain; add no new count in this walkthrough. |
| P2: Is the shared launcher opening repeated once per config? | The retained report merges `libs/dialogs/src/launcher.ts:9` into one physical reference with several contexts. Inspect the one source call and the existing occurrence. | `already-accounted-for`: preserve all config contexts, count the physical call once. |
| P3: Is the other `CoolDialogComponent` a target usage? | `apps/admin/src/unrelated.ts:6` declares its own class, used at line 8. The target is `libs/dialogs/src/dialog.ts`; the retained reference inventory excludes the unrelated file. The earlier wrong-target probe test also verifies rejection. | `explained`: different declaration identity; retain the rejection rather than relying only on a matching name or an empty result. |
| P4: Does `openSelected` always open this dialog? | `libs/dialogs/src/launcher.ts:5` maps `cool` to the target and `other` to OtherDialog; line 11 accepts either key and forwards `DIALOGS[key]`. No single selected value is established by that method. | `unresolved`: preserve the dynamic candidate and gap. A caller-specific claim needs a proven argument/value chain; runtime selection cannot be made unconditional from this method's static declaration. |

Review summary: four investigated items, one recovered miss from the earlier run, one already accounted for, one explained and one unresolved. The unresolved runtime selection remains visible; the walkthrough does not change the collection's partial status or its 18-span inventory.
