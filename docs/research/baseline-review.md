# Angular usage lookup: independent baseline review

Review instance: 1 of 3  
Date: 2026-10-13  
Verdict: **Not ready** for the intended complex-monorepo coverage claim. The baseline remains a useful, candidly scoped component pilot; one demonstrated config-routing defect needs a bounded correction.

## Findings

### P1 — A loaded config is incorrectly treated as the config that answered the reference query

**Location:** [collect-references.mjs](../../skill/angular-usage-lookup/scripts/collect-references.mjs), lines 99–119, 125–127 and 140–146. The collector opens the declared config's roots, verifies a template definition probe, then queries references at the shared target declaration. It only checks that a log says the declared config was enabled. It subsequently stamps every result with that declared config and marks the row `verified`.

**Failure:** A normal solution with overlapping app/test configs can load both configs while the shared declaration query selects the app's default project. A test-specific template probe can resolve correctly without changing the project that answers the later declaration query. Therefore neither a successful probe nor the enabled-config log establishes the claimed per-query context.

Reproduced with the unchanged baseline collector and Angular 21.2.25:

| Experiment | Correct spec references | Collector result | Consequence |
| --- | ---: | --- | --- |
| App and spec share production roots; spec adds `src/spec.ts` | 14 | 11, `succeeded` / `verified` | Omits the spec import, registration and template occurrence. |
| Move both anchor and definition probe to the spec-only file | 14 | Same 11, still `verified` | Selecting a unique anchor/probe does not fix the class query. |
| App also has `src/app-only.ts`, excluded by spec | 14 | 14, still `verified` | Omits all three spec-only references and falsely attributes all three app-only references to `tsconfig.spec.json`; the total count conceals the error. |
| Query references directly at the verified spec-only template token | 14 | Exact 14, no extras or omissions | Existing Angular per-file query behavior provides a bounded correction path. |

Both spec configs compile with official `ngc --noEmit`. The exact expected locations are the original fixture's 11 independently authored references plus three source-authored references in the new spec consumer. The direct probe-query comparisons use all start/end positions, not counts alone. In the disjoint case the baseline has 11/14 correct spec locations, about 78.6% precision and recall for this controlled config. This is a counterexample, not an estimate of production accuracy.

**Reproduction:** All following paths are relative to `skill/angular-usage-lookup/`. The frozen fixture is `test-output/baseline-review/overlap-disjoint-workspace/`. Its root `tsconfig.json` references `tsconfig.app.json` and `tsconfig.spec.json`; both include `src/**/*.ts`, app excludes `src/spec.ts`, and spec excludes `src/app-only.ts`. Its `lookup.json` declares only the spec config, with a spec-only anchor and template probe. Run:

```sh
node scripts/collect-references.mjs --workspace test-output/baseline-review/overlap-disjoint-workspace --manifest lookup.json --output test-output/baseline-review/reproduced-disjoint-report.json
node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p test-output/baseline-review/overlap-disjoint-workspace/tsconfig.spec.json --noEmit
node test-output/baseline-review/query-probe.mjs overlap-disjoint-workspace
```

The retained original outputs are `overlap-report.json`, `overlap-specific-anchor.json`, `overlap-disjoint-report.json`, `probe-reference-query.json` and `disjoint-probe-reference-query.json`, in `test-output/baseline-review/`. Each fixture contains `expected.json` and `expected-locations.json`; `review-evidence-hashes.json` freezes the retained evidence. Reports retain both enabled-config log lines, native references and process termination evidence.

**Impact:** Separate test/story configs are part of the default scope and a central large-workspace acceptance case. False project contexts and hidden missed consumers undermine migration impact analysis even though the overall collection status is always `partial`. The skill's candidate sweep could discover the mismatch, but the JSON currently presents the incorrect contexts as confirmed and does not flag ambiguous routing.

**Smallest credible correction:** Use reference queries anchored in a verified consumer context and prove their association with the declared configuration. The demonstrated spec-only template query recovers the correct inventory through the existing server. Where probe ownership or query routing is shared/ambiguous, report an unresolved config instead of `verified`. Do not simply union an unqualified declaration query with probe-query results: that would retain the demonstrated app-only references under a false spec context. Add this overlapping/disjoint fixture as a regression that asserts both omitted references and forbidden per-config references. No new semantic engine is justified by this evidence.

A related focused check replaced alpha's template probe with beta's external-template probe in the existing `nx-two` workspace. The alpha row still passed after loading both projects. Its references happened to remain in alpha, but its supposedly qualifying probe belonged to beta. This is additional evidence for checking probe ownership; it is the same finding, not a second defect.

## Plan Review

The [scale-vetting plan](scale-vetting-plan.md) correctly distinguishes fixture recall from universal accuracy and human helpfulness; requires every discovered config to be accounted for; and prevents repeated simple cases from masking a failed category. Its generated-workspace, independent-oracle, resource-measurement and boundary-case phases are appropriate.

The current baseline does not satisfy that expanded plan. Its eight-project fixture has one positive consumer config per project and cannot expose the overlapping default-project selection reproduced here. The scale phase should preserve separate app/test/story programs with overlapping roots and distinct references, compare project contexts as well as physical locations, and include configs with no known target use. A no-positive-probe config must remain explicitly unresolved unless separate evidence supports a stronger conclusion; silently excluding it would change the denominator.

Performance remains unmeasured by this baseline review. Static inspection shows one Angular process per manifest row, all roots opened, and sequential Nx `show project` calls. These are measurement targets, not established bottlenecks or grounds for an architecture replacement. The parent is conducting the new scale experiments separately; this report does not pre-approve their results.

## Author-Claim Reconciliation

| Author claim | Evidence inspected | Status | Review consequence |
| --- | --- | --- | --- |
| Angular/TypeScript supply semantics; helpers provide small orchestration/evidence glue. | All five scripts and their imports/calls. | Confirmed. | Retain this approach. |
| Fresh Angular processes, positive identity probes and config-load evidence establish each manifest config's collection. | Collector plus overlapping/disjoint reproduction. | Contradicted as a config-routing guarantee. | Finding P1; a loaded config and a valid probe are insufficient. |
| Collection JSON is always partial and excludes final classification/reconciliation. | Collector lines 64–72; report contract; skill workflow. | Confirmed. | Avoids a false global completeness claim, but does not excuse false per-config contexts. |
| Exact baseline reference positions and contexts are tested, with negative identity cases. | Three test files and fixture expectations. | Confirmed as test design; historic pass results not independently rerun. | Strong regression foundation; add overlapping-config oracle. |
| Combined suite contains 20 tests after the catalog extension. | Nine lookup, five stress and six catalog tests; prior result documents. | Confirmed count; historic execution is author evidence. | Full suite intentionally not rerun redundantly. |
| Broader selectors, member queries, shared owners, built declarations, test/story configs and production scale remain unqualified. | Acceptance matrix, local collection, stress results and brief. | Confirmed; candid limitations. | These are qualification gaps, not undisclosed implemented features. |
| Material catalog covers installed typed entrypoints, with explicit boundaries and private-API maintenance. | Generator, exact-version profile, metadata/error tests, material runbook/results. | Supported by code/test design; catalog generation not rerun. | No demonstrated catalog defect. Keep requalification gates. |
| Peculiar review is a manual skill workflow, not automated dataflow or a measured agent evaluation. | SKILL.md, report contract and stress walkthrough. | Confirmed. | Useful procedure; does not prove a 95% human-helpfulness score. |

## Verification Performed

- Read repository guidance, all five helper scripts, all three baseline test files, relevant fixture/config data, skill and reference documents, brief, plans and result documents. Implementation/tests were inspected before explanatory rationale.
- Verified main has no commits and repository files are untracked. Reviewed the explicit working-tree boundary instead of inventing a Git diff.
- Verified **103/103** frozen baseline file SHA-256 hashes at review start and end; no baseline implementation, test, reference or package file was modified.
- Ran four focused baseline collector experiments: foreign-project probe, overlapping configs, unique spec anchor/probe and disjoint app/spec consumers. Retained raw output rather than only summaries.
- Ran two direct Angular template-probe reference experiments. Both matched all **14** expected spans with **0** missing and **0** extra locations. Direct clients reported exited children and empty stderr.
- Compiled both new spec configurations with `node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p <config> --noEmit`; both exited 0.
- Retained reusable probe code, exact expected locations and an evidence hash manifest in the ignored review experiment directory. That script writes experiment reports/oracles only; it does not alter scanned source/config files.
- Did not rerun the complete existing suite, install packages, edit the baseline, stage, commit, publish or start another review instance. No browser/runtime behavior was tested.

## Open Questions And Residual Risks

1. **Real-workspace qualification:** a generated 50-library workload can exercise scale and patterns, but cannot establish 95% accuracy across an unknown real monorepo. Report the measured denominator, per-pattern outcomes and unqualified boundaries beside any percentages.
2. **Zero-use projects:** the helper requires a positive known target reference per config. Documentation honestly retains configs without one as unresolved. The large-run report must show their number and useful next check; this limitation can dominate coverage even when collected positive references are accurate.
3. **Diagnostics:** the collector records backend messages but does not gate successful rows on source/template diagnostics. The final source/candidate reconciliation remains necessary. This review did not reproduce a separate diagnostics-caused miss, so this is an investigation boundary rather than an additional finding.
4. **Partial-row references:** reference records enter the global map before all references in that row are validated. A later unreadable/unmapped location could leave earlier records attached to a failed row. The report does preserve failure status; no realistic failure was reproduced here, so no separate severity is assigned. A transactional per-row merge would be a small robustness improvement if a relevant regression is demonstrated.
5. **Private APIs and version limits:** the catalog intentionally calls Angular private migration metadata APIs and guards exact versions. Its tests cover meaningful declaration damage and identity cases. Cross-version support, effective API flattening and package-to-source identity remain explicit qualification work; generic warnings are not reasons to replace the extractor.
6. **Skill execution:** candidate reconciliation, classification and every peculiar investigation depend on agent work. The baseline tests exercise helpers and known follow-up query locations, not blind end-to-end skill behavior. A helpfulness rubric needs reviewed reports or a user trial; reference-set accuracy alone does not supply it.

## Preliminary Findings Ledger

Recorded before reading the explanatory brief, plans and result documents. The task bootstrap gave scope and expected use, not author rationale. The parent had already checked codebase-memory coverage and found this repository unindexed; targeted source reads were required. The original ledger mistakenly stated 95 frozen files; the executed hash result was 103, corrected here.

| Preliminary concern | Reconciliation |
| --- | --- |
| Config loaded does not prove which config answered the shared target query. | Confirmed; P1, including missed and falsely attributed references. |
| Serial discovery and per-config servers may become expensive. | Still a measurement question; parent scale experiment owns the evidence. |
| A failed row may retain partially merged references. | Code-supported boundary; no reproduced case, not a material finding in this pass. |
| Successful probes are weaker than successful template checking. | Contract limits are explicit; diagnostics boundary remains unmeasured. |
| Material relies on private metadata readers. | Exact-version guard, candid documentation and negative tests address the immediate maintenance contract. |
| Class-only target handling and positive probes may constrain broader APIs/zero-use projects. | Explicitly documented qualification boundaries; retain in scope accounting. |
| Baseline tests do not cover overlapping configs or realistic scale. | Confirmed test gap; overlap now has a focused reproducer, scale is being evaluated separately. |

## Verdict

**Not ready** for the requested complex Nx coverage target on the frozen baseline. A common app/test overlap can report the wrong config as verified, omit real consumers and assign false contexts. The correction appears achievable through the existing Angular backend and small qualification/query changes. The broader skill is thoughtfully bounded and has useful evidence-preserving tests; this review does not find a need for a heavy pivot.

## Recommended Next Actions

1. Accept/dispute/defer P1 explicitly in the initiating task. Correct query-context routing or fail closed, and add the disjoint app/spec regression so an equal reference count cannot hide a substitution.
2. Finish the already-authorized scale and diverse-boundary experiments with per-pattern precision/recall, context checks, all-config accounting and resource observations. Keep unknowns outside recovered-reference counts.
3. Refresh documentation only to the demonstrated capabilities and retain real-repository/skill-helpfulness gates. If collector behavior changes materially, use the next independent review instance within the existing maximum of three; this reviewer starts no additional instance.
