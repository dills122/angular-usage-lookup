# Independent final review

Review instance: 2 of 3. Date: 2026-10-13.

Verdict: **Not ready** on the frozen pre-fix snapshot. One confirmed identity defect needs a bounded correction; no heavy architecture pivot is warranted.

## Preliminary blind-pass ledger

Recorded before reading the author explanation or baseline review. The reviewer received only the neutral bootstrap, scope, repository instructions and scale-vetting plan. No implementation conversation was inherited.

- Verified all 122 hashes in `skill/angular-usage-lookup/test-output/final-review-hashes.json`; no mismatch. Repository is on `main`, has no commits and is untracked. The baseline manifest uses skill-relative paths; normalizing those shows existing changes in `SKILL.md`, `package.json`, and `scripts/collect-references.mjs`, plus the new Angular context adapter and config/API/scale test files. The lockfile and surrounding helpers are unchanged.
- Read the implementation and retained tests before author rationale/results. Codebase-memory index status and exact-scope coverage both returned `project not found or not indexed`; source fallback was used. Serena has only a Bash language server in this repository.
- No confirmed blocker at this stage. Review questions retained for reconciliation: (1) confirm that uniqueness among enabled Angular programs establishes actual ngserver request ownership; (2) check whether partial row failures can leave misleading confirmed references attributed to a failed configuration; (3) distinguish generated location/context scores from usage classification and human helpfulness; (4) keep the pipe `transform` member lookup and token-inclusion API checks separate from class-level/exact-span coverage claims.
- No CPU-heavy checks run while the author's timed scale qualification was active.

## Findings

### P1 — Reject ambiguous binding probes before confirming their reference union

`scripts/collect-references.mjs:36–40` accepts a definition response whenever *any* definition matches the target. The new consumer query at line 130 then obtains references for that entire ambiguous token, and lines 146–161 label every returned location `confirmed`.

A valid Angular fixture has `Target.value` and `Other.value`, both `@Input('shared')`, a combined `<div target other [shared]="1">` consumer and separate target-only/other-only consumers. Angular compilation succeeds. Definition lookup at the combined binding returns both member declarations; the collector reports `collectionStatus: succeeded` and falsely confirms `Other.value` at line 3, column 72 and the other-only binding at line 4, column 95 under the `Target.value` target. Both are labeled `classification: confirmed`, `isDeclaration: false`. Retained evidence: `skill/angular-usage-lookup/test-output/final-review/binding-collision/types.ts` and `report.json`.

This violates the exact-declaration/zero-unrelated-target contract and can misdirect a member migration inventory. The smallest credible correction is to reject probes whose definition set contains another target, retain an explicit ambiguity gap, and select a separately proven target-specific probe when available. A broader union needs per-location identity proof before confirmation. Add a regression asserting the other-only binding and declaration are never confirmed.

Reproduce from `skill/angular-usage-lookup/`:

```sh
node test-output/final-review/binding-collision/probe.mjs
```

The script compiles the fixture, retains the native report and exits **1** because two unrelated references violate its zero-false-confirmations assertion. It does not edit fixture source/config files. The evidence directory also contains a SHA-256 manifest. The author accepted this finding before report completion; no correction is included in this review boundary.

No other actionable finding was confirmed.

## Plan Review

The plan is proportionate and largely executed: a fresh baseline review identified wrong app/spec routing, a generated workload provides 54 libraries and three apps, Nx discovery accounts for 57 projects and 120 config rows, Angular compilation covers 63 nonempty configurations, and exact independent oracles compare both physical locations and config sets. All 57 empty solution configs are accounted for through their references. Card collection covers all 63 leaves; dialog collection covers 61 and explicitly excludes UI/shared programs without a dialog dependency. These exclusions do not hide an unmeasured positive consumer.

The baseline config defect is addressed by querying a uniquely owned consumer and rechecking ownership after references. The disjoint app/spec fixture prevents equal counts from hiding substitutions. Installed ngserver source confirms that `onReferences` obtains the query file's default project, supporting the reason for the change. The new proof is limited to enabled programs and the pinned server protocol; documentation makes that boundary explicit.

The generated precision/recall target is met for the authored card/dialog sets, including per-pattern denominators. It is not met as a general API-identity assurance because the new shared-binding counterexample returns false confirmed members. This needs one bounded guard/regression, not replacement of Angular/TypeScript semantics. No source implementation, dependency, service or workstream expansion is justified.

Performance and output sizes are retained; peak memory is honestly unmeasured after the sandbox denied profiling. Human helpfulness, real-repository sampling, built declaration mappings, unusual executors, runtime stories/tests, broad inherited/model/two-way APIs and additional Angular versions remain later qualification gates. The readiness statement in `scale-results.md` must be conditioned on resolving this review finding. Ordinary reference collection must remain partial until skill-directed classification and candidate reconciliation finish.

## Author-Claim Reconciliation

The author explanation was read only after the preliminary ledger and independent implementation pass.

| Author claim | Evidence inspected | Status | Review consequence |
| --- | --- | --- | --- |
| Existing Angular, TypeScript and Nx tools supply semantics; helpers orchestrate and retain evidence. | Six helper modules, imports, lockfile and installed ngserver reference/owner handlers. | Confirmed. | Keep the architecture. |
| Consumer ownership qualification fixes app/spec query substitution and rejects shared/foreign/missing probes. | `angular-context.mjs`, collector, config tests, baseline review and raw scale contexts. | Supported for tested layouts. | The pinned enabled-program proof is appropriately bounded; this is not arbitrary workspace certification. |
| Optional member targeting resolves one explicitly declared identifier and rejects invalid targets. | Collector lines 59–65, API tests and fixture. | Confirmed for target selection; incomplete for consumer identity. | A valid explicit target still receives unrelated references from an ambiguous binding. Finding P1. |
| Card has 489 exact spans / 8,015 context pairs; dialog has 114 / 2,184, with no discrepancies. | Independently compared raw `card.json`/`dialog.json` with `oracle.json`; inspected generator and metrics. | Confirmed for the frozen oracle. | Does not establish general API accuracy or human helpfulness. |
| Six API queries cover 11 template/API associations with token inclusion, not a complete exact-range oracle. | API test, fixture and result documentation. | Confirmed; execution is author-provided suite evidence. | Denominator remains separate; absent same-binding collisions allowed P1 to escape. |
| Generic reference kinds are not final usage classification; all collection reports remain partial. | Collector report construction, SKILL, report contract and large-workspace runbook. | Confirmed. | Candid global status does not excuse a false per-reference `confirmed` label. |
| 27/27 normal tests and 1/1 scale test pass; 63 Angular children exit and sources are unchanged. | Author command results, scale harness/metrics/reports, independent 774-file hash comparison. | Source integrity and raw metrics confirmed; full suites not independently repeated. | Existing successes remain valid evidence within their cases. |
| Memory, real-workspace accuracy and numeric helpfulness are unmeasured. | Author packet and scale results. | Confirmed as disclosed limitations. | Preserve later gates; do not substitute synthetic scores. |
| A failed row can retain earlier valid references if a later span fails. | Global reference-map update order and explicit author limitation. | Confirmed code behavior; no realistic failure reproduced. | No additional severity assigned; keep failed coverage visible. |

## Verification Performed

- Read repository instructions, workflow and steering, neutral bootstrap, scale-vetting plan, skill workflow, all helper source and retained test source.
- Checked Git state and all **122/122** frozen SHA-256 values at start and finish; no mismatch. No frozen implementation/test/SKILL/package file was changed.
- Queried codebase-memory index status/coverage; graph unavailable for this repository.
- Inspected installed Angular server source: reference queries and external-template owner queries use `getLSAndScriptInfo`, with the query file's default configured project.
- Ran the compiled shared-binding experiment twice, once directly and once through the retained `probe.mjs`. Angular `ngc --noEmit` exited 0; collector incorrectly succeeded; the retained assertion exited 1 with exactly two unrelated confirmed references. The final child reported exited with empty stderr, and an OS liveness check found no remaining process.
- Independently compared complete raw location keys and per-location config sets against the pre-generated oracle: card **489/489**, **8,015** pairs; dialog **114/114**, **2,184** pairs; zero missing, extra or context mismatches in those oracle sets.
- Independently hashed all **774** generated source/config files; no mismatch. Discovery contained **57** projects, **120** config rows, **63** nonempty configs and no discovery gaps.
- Reviewed author-reported normal suite **27/27**, **55.97 s**, and scale **1/1**, **205.77 s**. Did not redundantly rerun either full suite. Raw metrics record 16.22 s discovery, 41.15 s compilation, 131.96 s card collection and 15.97 s dialog collection.
- Wrote only this review and isolated ignored reproduction/evidence files. No fixes, package changes, commits, staging, publication, additional reviewers or browser/runtime qualification.

## Open Questions And Residual Risks

- The generated benchmark cannot establish real-repository accuracy or human helpfulness. Most card cases are repeated auxiliary templates; per-pattern results and the API denominator must remain visible.
- Enabled Angular project logs and template-owner protocol behavior are pinned-server assumptions. Uniqueness in enabled programs is conservative evidence for tested layouts, not proof about every possible configuration.
- Positive probes are required; true unused-target certification and shared-template owner automation remain unresolved capabilities. Source/template diagnostics are retained but do not independently gate successful rows.
- A late span failure could leave earlier valid evidence attached to a failed row. No realistic counterexample was reproduced, and the author discloses the behavior; do not inflate it into a separate blocker.
- API containment assertions do not check the complete reference set. The regression for P1 should assert absence of unrelated references as well as failure/ambiguity status.

## Verdict

**Not ready** on the frozen pre-fix snapshot. The generated workload and query/config correction have strong retained evidence, but shared public binding names can produce unrelated confirmed member references. The intended exact-identity contract requires this bounded correction before declaring the integration ready for a supervised real-workspace trial.

No heavy pivot is necessary. Review instance 2 of the allowed 3 is complete; this reviewer starts no further instance.

## Recommended Next Actions

1. The author has **accepted** P1. Fail ambiguous consumer identity closed before reference collection; add the compiled collision fixture as a regression with zero unrelated confirmations.
2. Run checks proportionate to the identity guard, preserve this pre-fix report/evidence, and update the peculiar ledger/readiness language to reflect the correction and its remaining gaps.
3. Have the initiating task use the remaining review instance only for the bounded correction and final code/plan reconciliation. Keep the real-workspace, memory and human-helpfulness gates explicit. No further review instance may be started after instance 3 without the required human decision.
