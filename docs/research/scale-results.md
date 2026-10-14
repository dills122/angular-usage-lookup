# Large-workspace qualification — 2026-10-13

The generated **54-library, three-app** workload passes its location/context oracle after evidenced corrections. The skill remains a qualified integration for the tested patterns, with explicit gaps. This does **not** establish 95% accuracy or helpfulness on arbitrary production repositories. The owner selected generated validation; no real workspace was supplied. [S0, S24 in sources.md]

## Workload and independent expectations

The [generator](../../skill/angular-usage-lookup/tests/scale/workspace.mjs) extends the earlier six-library fixture with 48 feature libraries, three chains of 16 modules, shared fan-in and a third app. Each app consumes two chains. Features mix standalone and NgModule consumers; each adds eight auxiliary Angular components and an unrelated same-name/same-selector negative scope. There are **561 TS files, 27 HTML files and 774 source/config/fixture files in total**.

Nx discovers 57 projects, 57 empty solution configs and **63 nonempty leaf configs**: one per library and production/spec/story configs for each app. Angular `ngc --noEmit` passes all 63 through Nx targets with caching bypassed. These are real Angular programs and Nx project definitions using `nx:run-commands`; they are not browser apps, production builds, inferred `@nx/angular` executor qualification or real Jest/Storybook integrations.

The source-authored dependency blueprint and expected text occurrences are converted into UTF-16 start/end positions **before** lookup. Expected config membership comes from that blueprint and the independently authored earlier fixture. The oracle is not generated from returned references. Source hashes are frozen before discovery/collection and checked afterwards. Assertions compare complete location sets and each location's config set, not just counts.

## Final measured results

These results are from the final strict identity guard, not the earlier passing snapshot. The fresh 29-test log is `test-output/full-final-run.log`; the final scale log is `test-output/scale-verified-run.log`.

| Target | Exact semantic reference locations | Exact location/config pairs | Verified leaf configs | False positives / omissions / context mismatches |
| --- | ---: | ---: | ---: | --- |
| SuperCoolComponent | 489 / 489 | 8,015 / 8,015 | 63 / 63 | 0 / 0 / 0 |
| CoolDialogComponent | 114 / 114 | 2,184 / 2,184 | 61 / 61 declared | 0 / 0 / 0 |

Card scope accounts for all 63 leaves. Dialog scope accounts for 61 analyzed leaves and two explicitly excluded leaves, `ui` and `shared`, whose source programs have no dialog dependency. Their imports/exports were inspected; the earlier negative-program test also rejects a dialog target absent from the UI program. All 57 solution configs are accounted for by their references. TS-only dialog rows retain template-coverage gaps. No excluded leaf is silently counted as semantically analyzed.

The card inventory contains **479 template locations, nine other symbol dependencies and one declaration**. Dialog's 114 spans include one declaration and 113 TS dependencies; they are not 113 rendered dialogs. The 48 new direct `MatDialog.open(CoolDialogComponent)` calls are separately authored cases. Alias/property/wrapper follow-up tests remain necessary for other openings. Generic collector output is not automatic migration classification.

For each target's frozen supported static reference set, measured precision and recall are **100%**, with exact context membership. That clears the proposed 95% fixture threshold, but says nothing statistical about an unknown repository. Repeated auxiliary templates dominate the count, so the per-pattern checks matter:

| Card pattern | Recovered / expected |
| --- | ---: |
| Earlier mixed templates / symbol dependencies | 16 / 16; 10 / 10 |
| Legacy `ngIf` / `ngFor` / switch | 12 / 12; 6 / 6; 12 / 12 |
| Modern `@if` and `@for` | 12 / 12 |
| `@defer` | 6 / 6 |
| Template outlet / projection | 6 / 6; 6 / 6 |
| CRLF with preceding UTF-16 emoji | 12 / 12 |
| Auxiliary component templates | 384 / 384 |
| Spec-only / story-only / third app | 3 / 3; 3 / 3; 1 / 1 |

The separate API fixture compiles and passes six queries covering **11 expected template/API associations**: compound/comma/negated selectors, host composition, pipe transform references, input/output aliases and their host re-exposure. Its token-containment checks and known negative do not establish a complete exact-range API oracle; keep that denominator separate. An inherited/overloaded/member lookup that cannot identify one explicit declaration must be resolved separately.

## Performance and reproducibility

Observed on this host with Node 22.23.3, Angular 21.2.25, TS 5.9.3, Nx 23.3.0 and Material/CDK 21.2.14:

| Stage | Wall time |
| --- | ---: |
| Nx discovery | 17.05 s |
| All Angular typechecks, two workers, cache bypassed | 41.95 s |
| Card collection, 63 sequential Angular processes | 131.55 s |
| Dialog collection, 61 explicit TS programs | 15.67 s |
| Complete scale test including generation/assertions | 206.74 s |

Card evidence JSON is 5,180,224 bytes; dialog JSON is 3,235,171 bytes. All 63 Angular children exited and PID liveness checks passed. Scanned source/config hashes were unchanged. The normal suite passed **29/29** in 55.55 seconds; the separate scale test passed **1/1**. No dependency was added or upgraded for this work.

Peak memory remains **unmeasured**. `ps` was denied and `/usr/bin/time -l` failed on `sysctl kern.clockrate` in this sandbox; the profiler failure was preserved and the qualification rerun without it. Wall times are observations, not a production SLA or a claim about simultaneous aggregate RSS. The workload has hundreds, not tens of thousands, of source files.

From the isolated skill directory, run `npm test` and `npm run test:scale`. The latter regenerates only its fixed ignored fixture directory. It writes `test-output/scale/{oracle,source-hashes,metrics,card,dialog}.json` and command logs outside the scanned workspace. The first-pass reports/oracle remain under `test-output/scale-first-pass/` in this checkout. Retained generator/tests make the final qualification reproducible without tracking generated workspaces or multi-megabyte reports.

## Peculiar investigation ledger

Every item below was investigated. Outcome counts: **3 recovered misses, 6 explained, 1 already accounted for, 2 unresolved**. Unresolved coverage/flow is not counted as a recovered usage. General untested capabilities are listed separately below, rather than invented as observed failures.

| ID / original observation | Completed checks and outcome | Remaining action |
| --- | --- | --- |
| P1: App/spec overlap returned 14 spans but substituted three app-only references for three spec-only ones. | **Recovered miss.** Independent review reproduced it with exact spans and successful compilation. ngserver selects by query file; a shared declaration was routed to the wrong program. Query a verified consumer, prove unique membership among enabled programs using TS, and recheck after the request. Regression returns the exact 14 spec spans; scale verifies all nine app configs. | Requalify enabled-config/owner protocol assumptions when changing Angular versions. |
| P2: Initial scale dialog result had all 114 physical locations but lacked one lazy-call location in 48 library contexts. | **Recovered miss.** Compared expected/actual config sets and inspected the destructured lazy binding. Added the existing TS binding reference probe in every affected program. Final output has all 2,184 expected context pairs, including expanded third-app/spec/story scope. The first-pass missing contexts were preserved; the oracle was not weakened. | Skill must apply alias follow-ups to every implicated program, not stop after recovering one physical site. |
| P3: Pipe token did not resolve to the requested class. | **Recovered miss.** Raw Angular definition points to `FormatPipe.transform`, not the class name. Added optional explicit member selection using TS AST identifiers, then ran pipe and aliased input/output probes. All 11 API associations pass; missing declared members fail. A separate TS-backend class query returns the three pipe declaration/import/registration spans; the Angular-only server returns no definition for that plain TS import probe. | Collect class/import references and transform/template references as distinct parts of a pipe inventory. |
| P4: One external HTML file has two owners with different matching classes. | **Unresolved automated owner coverage.** Source establishes each owner's direct imports; Angular's shared-file query selects one scope and its owner request returns two locations. The collector rejects qualification rather than attributing both owners to that selected class. The regression checks the two-owner evidence and empty confirmed output. | Use owner-specific evidence or the full manual selector/scope chain for each owner; a general per-owner backend route remains unqualified. |
| P5: A config has no positive probe. | **Explained qualification failure.** A no-probe regression fails explicitly; the same config with its verified spec consumer passes. Missing manifest evidence is not a zero-use finding. | True unused-target certification remains outside the helper's capability; retain unresolved scope until separately verified. |
| P6: `MatDialog.open(DIALOGS[key])` could open this or another dialog. | **Unresolved runtime selection.** Inspected the two registry values, the `keyof` parameter and caller/reference tests. Constant property/alias/wrapper paths can be followed; an unspecified runtime key cannot be assigned one target. | Keep a conditional candidate and inspect actual callers/values in a real workspace. Do not count a generic wrapper body as always opening this target. |
| P7: Plain story render strings contain the target tag but yield no semantic target usage. | **Explained.** Inspected all three generated `render-story.ts` exports: strings occur outside Angular component metadata, and these fixtures have no Storybook runtime/config. They are collateral/candidates for an actual integration, not Angular-owned templates here. | Qualify actual Storybook rendering when supplied; these examples do not certify it. |
| P8: Unrelated classes/selectors look identical to the target. | **Explained.** The 48 feature negative scopes and original admin negative have their own declarations/imports. The exact oracle has no extra references; focused wrong-identity probes fail. | Preserve declaration identity when searching other families/scopes. |
| P9: A FancyDirective class reference occurs on `wrapped`, without its own selector attribute. | **Explained.** Source `hostDirectives` points to that class; Angular returns the wrapper element and resolves re-exposed input/output aliases to their declaring members. | Classify as host composition impact, not a direct selector occurrence. |
| P10: Shared locations appear in many configs. | **Already accounted for.** Exact physical deduplication retains 8,015 card context pairs on 489 locations and 2,184 dialog pairs on 114 locations. | Count locations and contexts separately; these are not runtime instance counts. |
| P11: OS profiling wrapper exited unsuccessfully despite discovery output. | **Explained.** stderr identifies sandbox-denied `kern.clockrate`; a normal Node invocation succeeds. The qualification was rerun cleanly. | Measure process-tree peak memory in an environment with OS profiling access. |

| P12: Two directives expose the same input alias and the probe resolves to both. | **Explained and corrected false confirmation.** Review 2 compiled a collision case and reproduced two unrelated member confirmations. A nonempty definition set must now match the exact target in every entry before references are requested. The ambiguous-probe regression fails closed; the unique-probe follow-up returns exactly the target declaration and two bindings, including its shared-element use, with neither unrelated location. | If no uniquely resolved consumer exists, preserve an identity gap. Shared binding migration still needs both owners considered. |

## Readiness and next gate

Retain the skill and small helpers using official Angular/TypeScript/Nx semantics. The new production glue is query ownership qualification and explicit member anchoring; most added code is tests and fixture generation. No new CLI/MCP/service dependency was needed. The [large-workspace runbook](../../skill/angular-usage-lookup/references/large-workspaces.md) covers scope accounting, bounded batches, per-config alias follow-ups and report interpretation.

The [final independent review](identity-review.md), instance 3 of 3, found no new actionable findings and verified the corrected collision case, exact scale sets and source hashes. Its verdict is **Ready for a supervised real-workspace trial** of the tested paths. It is not yet evidence for a general production 95% guarantee. Unqualified areas include built `.d.ts`/source identity, remote/federated consumers, unusual/inferred executor configurations, actual test/story runtimes, broad inheritance/model/two-way APIs, router migration cases, additional Angular versions, much larger file counts and memory scaling. Material catalog generation remains package metadata; application usages of every Material family and bottom-sheet/snack-bar flows were not all tested.

Helpfulness was reviewed for actionable locations, config ownership, separated usage kinds, evidence-backed migration implications and useful next checks. There was no blind agent benchmark, independent human score or user trial. A real-repository gate should use a separately reviewed sample across target families and edge cases, record investigation effort, and include an Angular editor comparison. Until then, keep reports `partial` whenever in-scope uncertainty remains.
