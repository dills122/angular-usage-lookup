# Author Explanation

Review instance: 2 of 3. Read only after the preliminary pass in the bootstrap.

## Intent And Success Criteria

Keep the skill-first existing-tool architecture; test the owner's 50+ library/three-app scenario against independent expected locations and contexts, investigate peculiar cases, fix small demonstrated defects and describe remaining limits. A synthetic 95% threshold is an acceptance target, not a production or human-helpfulness claim.

## Plan-To-Implementation Traceability

`scale-vetting-plan.md` is the plan. The baseline independent review reproduced wrong app/spec routing. That finding was accepted and corrected. A generated 54-library/three-app workload now has 63 compiled configs and two complete reference/context oracles. Bounded API and failure probes supplement scale repetition. Result documentation and the scope runbook describe covered/unqualified areas. Your review supplies the final independent engineering check; no real-workspace gate was performed.

## Technical Approach And Flow

Nx's installed CLI supplies project inventory; TS config APIs enumerate roots. Official ngserver owns Angular semantics; a TypeScript service owns TS-only references. New `angular-context.mjs` uses enabled Angular config logs, Angular's external-template owner request, and TS program membership to select a verified consumer owned by exactly one enabled program. It checks before/after references and leaves ambiguous rows failed. The class declaration is no longer unioned into Angular queries, avoiding false contexts from its default project. TS-only backend still explicitly constructs the requested program and queries verified aliases.

The collector now optionally anchors an explicit class member through TS AST name positions. A template pipe definition points to `transform`; input/output aliases resolve to their declaring property. This is identifier selection, not custom template parsing or a new semantic engine. Missing/overloaded/inherited-elsewhere identifiers fail rather than selecting an unrelated member. Class/import and pipe-transform queries remain separate skill work.

## Changed-Component Walkthrough

- `angular-context.mjs` and `collect-references.mjs`: consumer query qualification and optional member anchoring.
- Config regression fixture/tests: app/spec substitution, shared/foreign probes, absent probe and multiple template owners.
- API fixture/test: six queries, 11 known template/API associations, one explicit selector negative, invalid-member guard. Token containment is weaker than a complete exact-reference-set oracle and is reported separately.
- Scale generator/test: authored dependency/text oracle, 54 libraries/three apps, mixed scopes/control flow, negatives, 63 leaf configs, real Nx/ngc checks, complete range/config-set assertions, cleanup/hash checks and timing/artifact sizes.
- Skill/references: correct consumer routing instructions, member/pipe distinction, large-workspace runbook and explicit report limits.

## Decisions And Rejected Alternatives

Retain installed, locked tools. No dependency changes, persistent service, new MCP bridge or custom compiler analyzer. Simple sequential collection passed this bounded scale; further optimization needs observed pressure. Context membership checks use public TS APIs and version-qualified Angular protocol/log behavior, costing additional program construction. This is intentionally conservative when probes are shared.

## Invariants And Boundary Conditions

Never convert wrong/unknown ownership, missing probes or a TS-only success into full template coverage. Preserve native evidence and config identity. Keep source/config files read-only; generated fixture setup is separate from lookup. Collector status remains partial pending candidate reconciliation. Generic reference kinds are not final migration classifications. A failed row can retain earlier valid evidence if a later span fails; status/gaps must remain visible. No realistic late-span failure was reproduced in this pass, so transactional merging was not changed.

## Verification Performed And Results

`npm test`: 27/27 pass, 55.97s. `npm run test:scale`: 1/1 pass, 205.77s. Card: 489 exact spans, 8,015 exact context pairs, 63 verified configs. Dialog: 114 spans, 2,184 pairs, 61 verified configs; UI/shared explicitly have no dialog dependency. Both have zero omissions/extras/context mismatches. All 63 Angular children exited, liveness checks passed and source/config hashes were unchanged. Commands and raw reports are under `test-output/scale/`; `scale-results.md` contains full results and the investigated ledger.

First-pass evidence is retained under `test-output/scale-first-pass/`: card already passed, dialog had all physical locations but missed one lazy-call location in 48 new library configs. Adding the already-supported binding probe in those programs recovered membership; final scope also includes the third app and all spec/story dialog programs. Initial pipe failure is in `test-output/api-shapes/FormatPipe.before.json`; raw definition points to `transform`. Source/fixture expectations were not weakened to remove misses.

OS peak-memory profiling failed under sandbox restrictions (`ps`; `time -l` denied `kern.clockrate`). The profiling wrapper's failure was not counted as a passing test; normal qualification was rerun. Peak memory is unmeasured. No fresh npm advisory scan was performed because dependencies did not change.

## Risks, Tradeoffs, And Maintenance Costs

Enabled-config messages and the external-owner request are pinned-server assumptions. Uniqueness is among currently enabled Angular programs, not a universal workspace claim; fresh processes and after-query rechecks qualify the tested layouts only. Manifests/probes and skill-directed sweeps/follow-ups require agent effort. Raw evidence is several MB per target; hundreds rather than tens of thousands of files were exercised. Built package identity, general dataflow, actual Storybook/Jest, remote consumers, full Material application-family coverage and real production sampling remain unqualified.

## Deviations, Deferrals, And Known Gaps

Scale source generation is test infrastructure, not automatic production manifest generation. Oracle categories establish per-pattern recall but are not emitted classifier predictions. Human helpfulness has no numeric score. Shared-owner automation and runtime registry selection stay unresolved. No blind end-to-end agent trial or editor comparison was performed. The chosen generated workload meets the owner's current validation selection; a real-repository claim remains a later gate.

## Challenge Points For The Reviewer

Challenge query/config proof, accidental false context unions, source-built versus enabled-program assumptions, member identity, oracle independence/scope exclusions, and whether final claims exceed evidence. Review the plan and residual gaps as well as implementation. Follow the bootstrap's read-only ownership and maximum-review count; return findings before a verdict.
