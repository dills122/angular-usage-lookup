# Large-workspace vetting plan

Started 2026-10-13. Decision owner: repository owner. Question: how close is this skill to reliable, useful lookup in a complex Nx workspace with 50+ Angular libraries and three applications?

The owner selected a generated stress workspace for this pass. This authorizes isolated fixtures, existing-tool experiments and bounded corrections to demonstrated helper defects. No real application, migration, package upgrade, commit or publication is included. Keep the skill as the orchestrator; do not build a new semantic/dataflow engine.

## Acceptance and meaning of 95%

- Measure precision and recall against expected locations authored independently of collector responses. Separate physical usages, declaration/registration references and project contexts. Require zero unrelated targets falsely confirmed in these controlled fixtures; target at least 95% recall for declared supported static cases, both overall and by meaningful pattern category.
- A flagged unknown is accountability, not a recovered usage. Report unsupported cases and denominator/exclusion choices explicitly; repeated simple examples must not hide a failed category. Report any unmeasured category as unmeasured.
- Account for every discovered project/configuration as analyzed, failed, excluded for an explicit reason or unresolved. No silent omissions. Investigate every peculiar item before reporting, preserving remaining uncertainties.
- Measure elapsed time, maximum process memory where available, server/process cleanup, output size and repeated setup cost. Treat these as observations on this host, not a production SLA.
- Helpfulness is a review rubric: actionable locations/contexts, correct usage category, evidence-backed migration implications and useful residual investigations. Automated reference scores alone do not prove 95% human helpfulness or real-repository accuracy.

## Phases and stopping rule

- [x] Audit existing helper/code/skill scope and known limitations; get a fresh-context read-only review of the frozen baseline.
- [x] Generate at least 50 Angular libraries and three applications with varied module/standalone/template/code patterns, shared fan-in and separate test/story configurations. Freeze an independent oracle before running lookup.
- [x] Run official Nx discovery and Angular compilation, then actual Angular/TypeScript lookup across the declared scope. Record timing, resource use, exact metrics and failures.
- [x] Exercise harder identity/API/config boundaries in bounded cases; investigate misses/unknowns and fix small evidenced defects with regression tests.
- [x] Update the skill, qualification matrix, peculiar ledger and readiness decision. Validate changes and perform one final scoped review if materially changed behavior needs it.

Stop after the generated workload, diverse boundary cases and evidence-backed corrections support a readiness decision. Do not attempt exhaustive arbitrary runtime analysis. A larger integration or architecture change must be justified explicitly; unresolved real-workspace qualification remains a gate.

## Baseline review boundary

Uncommitted/untracked repository with no reviewable base commit; scope is `ideas/angular-usage-lookup/skill/angular-usage-lookup/{scripts,tests,references,SKILL.md,package.json,package-lock.json}` as present at the start of this pass. Existing generated output and installed dependencies are evidence/environment, not changes to review. Read baseline source rather than assuming documentation claims.

Codebase-memory list was paginated across all 52 projects; this repository was not indexed. Exact-path/scope coverage returned `project not found or not indexed`. Source fallback is required for the five helper modules and tests. Serena is configured only for Bash, so JavaScript source reads are the available fallback. Neither gap is evidence of application lookup coverage.

## Completed outcome

See [scale-results.md](scale-results.md) and the [final independent review](identity-review.md). The generated qualification, bounded corrections, 29-test regression suite and final scale rerun pass. All three allowed independent review instances are complete; the final verdict is Ready for a supervised trial of the tested paths, with no new actionable findings. Real-repository accuracy, human helpfulness and peak memory remain explicit later gates.
