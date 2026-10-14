# Validation

## Gate 1 — skill artifact checks

Initial artifact checks passed on 2026-10-13 before runtime integration: skill-creator metadata validation, local links/source IDs, UI metadata and relative discovery links. Those checks alone did not prove reference recall. Final artifact checks also passed after the pilot documentation changes: skill validator, all local Markdown links, JSON, whitespace and both repository discovery links. Installed dependency tree and generated-file ignore rules were checked.

Use `/Users/dsteele/.local/share/uv/tools/serena-agent/bin/python` with the unmodified `/Users/dsteele/.codex/skills/.system/skill-creator/scripts/quick_validate.py` validator; that existing environment provides PyYAML. No validator dependency was installed.

## Gate 2 — Angular 21 component backend qualification

- Status: **passed for the declared component fixture subset**, 2026-10-13. See [retained results](pilot-results.md) and [runnable commands](../../skill/angular-usage-lookup/references/local-collection.md).
- Hypothesis: official Angular language tooling can supply class-to-template references through small glue scripts without a custom analyzer.
- Authorization: owner explicitly requested the Angular 21 end-to-end example, then two Nx projects. Isolated local tooling/fixture dependencies were installed for that work.
- Budget/stopping rule: one Angular patch, one direct LSP integration and bounded fixtures; stop before a custom analyzer, persistent service or expanded feature matrix. The original two-hour pilot budget was a planning bound, not a measured effort claim.
- Inputs: Angular 21.2.25, TS 5.9.3, Nx 23.3.0, Node 22.23.3, Microsoft JSON-RPC/LSP libraries, independently authored expected reference locations.
- Success criterion set before collection: all expected direct references at correct source ranges, no unrelated target falsely confirmed, every fixture config accounted for, explicit failure behavior and no lookup source/config mutation.
- Observed: all 11 single-project and 10 Nx reference spans match exactly, including one declaration per inventory and three template instances in each. Both independent Nx consumer configs contribute correct contexts. Initial pilot suite: 9 passing tests, including compiler, failure and cleanup checks.
- Candidate reconciliation: skill-directed `rg` sweeps and source review classify extra comments/strings, declarations and unrelated scopes; recorded in the results.
- Report boundary: collector output is always partial until the skill reconciles candidates and scope. A successful query is not a whole-workspace coverage guarantee.
- Limits: minimal lookup/typecheck fixtures, no application browser/build, real workspace, editor baseline, unsupported API/selector cases or large-workspace performance qualification. Detailed untested cases remain in the [acceptance matrix](../../skill/angular-usage-lookup/references/acceptance-cases.md).

## Gate 2 extension — legacy scopes and Material dialogs

Passed 2026-10-13 on six Nx libraries/two apps. Expected locations preceded collection. All eight configs compile; 26 card references (16 template occurrences) match every expected span/context. The original dialog probe failed; adding the public TypeScript service and verified alias queries yields all 18 dialog references with explicit template gaps. Separate follow-up queries find alias/property/method callers. A variable-key registry remains unresolved. Full regression suite: 14 passes. See [results, failure history and scope limits](stress-results.md). [S19, S20]

## Gate 3 — real-workspace pilot

- Status: proposed; not run. No target repository was supplied.
- Next: inventory one component in an actual Angular 21 Nx workspace, then one attribute directive and aliased API. Enumerate test/story/build configs and compare with independently reviewed known locations and an Angular editor baseline.
- Retain raw query results, hashes, config ledger, candidates and scope gaps; compare locations rather than headline totals.
- Record setup time, scan/resource use and review burden without extrapolating fixture performance. Decide whether more glue is justified from observed failures.

## Gate 2 extension — generated Material lookup/family catalog

Passed 2026-10-13 for the pinned Material 21.2.14 profile. Six tests cover all typed entrypoints and exact representative selectors/aliases, inherited ownership, module/host relationships, shared/overlapping identities, reviewed opener signatures, source/graph integrity, determinism, relocation and refusal of unqualified/missing/corrupt metadata. The real CLI produces identical JSON, and the runbook's small dialog-family extraction was executed. [S21, S23]

The full combined suite passed **20/20** (about 31.5 seconds), including all earlier Angular/Nx compiler and reference tests. After final review added exact guards for common/forms/platform-browser, the six catalog tests and CLI equivalence check passed again; reference-collection code and dependencies were unchanged. Skill metadata validation and Markdown links/JSON/whitespace checks passed across 115 retained files, along with both discovery links. No new dependency was added; the earlier audit result was not rerun or presented as a fresh advisory scan.

The 37 family groups and 712 public export mappings are package inventory evidence, not application references. Source positions are tied to the installed declaration hashes, declared bindings are not flattened, and Angular's private metadata API requires version requalification. See [catalog results](material-catalog-results.md).

## Skill workflow extension — peculiar investigation pass

The owner requested this on 2026-10-13. The skill now retains every unexplained observation for a dedicated investigation pass and reports its outcome; unresolved in-scope uncertainty stays partial. The [four-case walkthrough](stress-results.md#peculiar-review-walkthrough--2026-10-13) was checked against existing fixture source, manifest and retained dialog output, without rerunning the backend. It checks the intended reporting decisions, not a new automated skill evaluation. Executable helpers and test oracles were unchanged; the earlier 20-test result remains historical validation of those helpers.

## Gate 4 — generated large-workspace shakedown

The owner selected generated validation. The [plan](scale-vetting-plan.md) defines independent location/context precision and recall, per-pattern checks, complete scope accounting and investigated peculiar items. The [results](scale-results.md) retain the 54-library/three-app workload, initial failures, corrections, final measurements and coverage limits. Nx discovers 57 projects and Angular compiles all 63 leaf configs. Card lookup matches 489 spans/8,015 context pairs; dialog matches 114 spans/2,184 pairs in 61 declared programs with two dependency exclusions. The normal suite now passes 29 tests; the separate scale test passes its complete oracle. [S24]

Fresh reviews reproduced two material identity/config failures that earlier positive tests missed. Corrections use the existing Angular/TS backends: uniquely owned consumer queries, all-definition identity checks, and explicit member anchors. Dialog lazy-binding follow-ups are repeated in all affected programs. The inspected peculiar ledger preserves failures, recoveries and unresolved shared-owner/runtime limits. OS profiling was blocked; peak memory is unmeasured. No new dependency or semantic engine was introduced.

This passes the declared generated static qualification. It does not close Gate 3: real-workspace accuracy, an editor comparison, actual test/story integrations, package identity, memory scaling and reviewed human helpfulness still need supplied-repository evidence. Scope/identity ambiguity remains partial, never an invented zero-use conclusion.
