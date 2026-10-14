# Decision log

## 2026-10-13 — skill first, official semantics, measured coverage

- State: skill authoring authorized by the owner; backend integration recommendation proposed.
- Recommendation: deliver the initial skill; research further through backend qualification before calling its inventories exhaustive.
- Evidence: official language-service reference implementation/tests [S2–S4], selector/programmatic/composition semantics [S5–S7], workspace CLI/MCP boundaries [S8–S10], and bridge limitations [S13–S15]. IDs resolve in [sources](sources.md).
- Choice: own instructions/reporting/validation, reuse the semantic engine. Use Angular 21 as the first qualification target based on the current LTS request and support table [S0, S1].
- Alternatives: IDE only, partial TS/text search, generic MCP alone, and custom compiler CLI. A maintained semantic engine is available, so a new engine has not earned its maintenance cost.
- Remaining uncertainty: no actual Angular 21/Nx runtime test or bridge integration has been run; main-source evidence is not version-pinned certification. Dynamic runtime completeness is excluded from the promised capability.
- Revisit when: a supplied workspace or fixture shows missed references, opaque project scope, inability to synchronize template owners, or unsupported LTS behavior.
- Next action: discuss and qualify an existing Angular-aware connection; prefer a bounded generic-LSP-bridge pilot if needed. No migration, connector installation, commit or publication is authorized by this recommendation.

## 2026-10-13 — keep integration local and scriptable

- State: proposed refinement following the owner's repeated preference for glue scripts/services and skills.
- Recommendation: a skill package with workspace-discovery and reference-collection helpers; use the official Angular service through an existing qualified connection or Microsoft protocol libraries. See the [ordered plan](plan.md).
- Changed reasoning: the earlier bridge-first recommendation is an integration candidate, not a required architecture. A one-shot local collector can keep repeatable mechanics alongside the skill without introducing a persistent custom service or making a generic MCP bridge mandatory.
- Evidence: existing Angular engine/transport [S2–S4], existing Microsoft protocol packages [S16], and the owner's packaging preference [S0]. Direct helper behavior remains untested; neither transport option is declared superior by measurement.
- Next action: prove the class-to-template query in the bounded Angular 21 fixture, then retain only the integration code that the experiment shows is necessary.

## 2026-10-13 — component pilot passed; retain local glue

- State: owner authorized implementation of the Angular 21 example and two-project Nx extension; both are completed.
- Evidence changing the earlier uncertainty: real Angular 21.2.25 class-reference queries matched 11 single-project and 10 Nx spans exactly, including templates and correct project contexts. Official Nx discovery/typecheck and Angular compiler checks passed; nine tests cover success and failure paths. [S18; results in pilot-results.md.]
- Decision: retain the skill plus three local helpers using official Angular tooling and Microsoft's protocol libraries. A generic MCP bridge and compiler-internals adapter are unnecessary for the demonstrated path.
- Boundary: explicit config manifests and known template probes; discovery and semantic collection remain separate. Keep collector status partial pending skill reconciliation. Do not advertise broad directive/pipe/API, built-library or arbitrary monorepo coverage from these fixtures.
- Dependency decision: lock the isolated fixture tooling, including Nx 23.3.0 with its Undici dependency overridden to 7.29.1 after npm's downgrade suggestion exposed different advisories. Final advisory check reported zero known vulnerabilities. No target-workspace dependency was changed.
- Next: one supplied real-workspace component trial, followed by an attribute directive and aliased API. No commit, publication or migration was performed.

## 2026-10-13 — qualify legacy scopes and dialog-only consumers

- State: owner requested harder legacy/NgModule/standalone tests, six libraries/shared code and Material dialog opening from code. The expanded fixture is complete.
- Evidence: all eight configs compile; the Angular path finds 26 exact card spans including 16 template occurrences without engine changes. The original dialog qualification fails because there is no template usage. Public TypeScript service plus verified alias queries recovers all 18 expected dialog spans in six programs. Four separate alias/property/method queries support skill-directed indirect paths. Full suite: 14 passes. [S19, S20]
- Decision: add a small TypeScript service adapter, keep Angular template and TS-only capabilities distinct, and preserve the template gap on TS rows. Follow reported barrel aliases and query verified local bindings; leave arbitrary flow to explicit skill investigation.
- Limit: a variable-key registry can open OtherDialog and remains a candidate. Generic wrapper bodies are not unconditionally target usages. No old-release, built-library, production-scale or browser-runtime certification is claimed.
- Next: apply this workflow to a supplied real workspace; qualify package declaration and test/story boundaries before expanding coverage claims.

## 2026-10-13 — generate Material package facts; keep opener rules reviewed

- State: owner requested Material mappings and family configs; a bounded generator is implemented and qualified on the installed profile.
- Evidence: all 74 typed entrypoints yield 712 public export mappings and 37 family groups. Angular's migration metadata reader preserves selectors, declared bindings, host directives and NgModule edges; TypeScript preserves shared re-exports and heritage. Six catalog tests include negative metadata cases and relocation/determinism. [S21, S23]
- Decision: retain one serialization helper using existing dependencies, with JSON indexes and generated entrypoint-based families. Keep only three behavior rules reviewed separately: dialog open, bottom-sheet open and snack-bar openFromComponent. No Dgeni source build or new service is needed for this experiment. [S22]
- Changed constraint: earlier reference collection avoided compiler internals. Catalog generation now deliberately uses the official but private `@angular/compiler-cli/private/migrations` reader; exact version guards and requalification are required. It is not used as a fallback semantic analyzer.
- Boundary: constructor typing is not runtime alias proof; declared bindings are not flattened; family/token matches are candidates until the consumer's semantic identity is established. Separate adapters/CSS and all conceptual relationships remain out of scope.
- Next: use the catalog to plan one real workspace family lookup, qualify package declaration identity and directive/member backends, then compare an independent usage oracle. No commit, publication, service or migration was performed.

## 2026-10-13 — investigate every peculiar observation before reporting

- State: owner requested an internal `peculiar` flag for incompletely understood cases, followed by a dedicated investigation of each before finishing.
- Decision: retain a skill-owned working ledger with stable IDs, original evidence, context, checks, conclusion and report updates. Outcomes are recovered-miss, already-accounted-for, explained and unresolved. Every queued item gets an investigation record; a blocked check or static limit remains explicitly unresolved.
- Evidence: the existing stress fixture contains a real recovered lazy-binding omission, references shared across configs, unrelated same-name declarations and a variable-key dialog candidate. The new walkthrough reuses retained evidence and source; no new backend result is claimed.
- Boundary: peculiar is an orthogonal review flag, not a fourth usage classification or an extra count. In-scope uncertainty that affects the answer keeps the report partial. The collector/catalog scripts remain unchanged; no automatic dataflow or queue service is introduced.
- Next: exercise the workflow on a supplied workspace and preserve the final outcome ledger alongside its usage inventory.

## 2026-10-13 — generated scale passes; retain the skill and bounded glue

- Owner authorized the 50+ library/three-app shakedown and selected generated validation. Scope and stopping rule are in [scale-vetting-plan.md](scale-vetting-plan.md).
- Evidence changes the earlier scale uncertainty: a 54-library/three-app Angular/Nx fixture has independent exact location/config oracles and passes discovery, 63 Angular compilations and collection. Bounded API/failure tests supplement the repeated templates. [S24; see scale-results.md.]
- Independent reviews found wrong default-project routing and shared-input identity unions. Accepted both findings; use uniquely owned consumer queries, require all probe definitions to identify the target, and preserve failed/ambiguous scope. Add explicit declared-member anchoring for pipe and input/output queries. These are small integrations of existing Angular/TS semantics.
- Keep the skill, local scripts and installed official tools. No new persistent service, MCP bridge or analysis engine is warranted by these observations. The Material catalog remains reusable metadata, not usage evidence.
- Interpret the 95% ambition as a measured target with separate reference precision/recall, config correctness and scope accounting. Synthetic scores do not establish real-world accuracy or human usefulness. Preserve unresolved shared-template ownership and runtime selection; do not count them as recovered.
- Next gate: a supervised supplied-workspace sample, including catalog/package identities and real test/story runtimes, with independently reviewed known locations and investigation effort. Peak memory and larger source counts remain unmeasured. No migration, commit or publication was performed.

## 2026-10-13 — render-path gauntlet requires explicit reconciliation

- Owner requested the full lazy/module/template/control-flow gauntlet. Add the matching official router as a test-only dependency; keep production helpers and the Material catalog unchanged.
- Evidence: 109 reconciled exact locations include 47 template occurrences, including 48 nested views. Public TS follow-ups recover seven references to renamed lazy locals. Angular LS reports a non-bindable descendant that compiler instructions establish as inactive; an active host remains in the positive oracle. [S25, S26]
- Decision: preserve exact-class qualification. Related local symbols need a verified source edge and their own reference query. Inspect backend hits for activation context; do not mistake provider references for render-instance counts. Extend the skill with a portable rendering-path checklist and preserve raw/corrected evidence separately.
- Real router/Material/CDK APIs compile, member/flow queries have exact-location checks, and opener signatures distinguish a local `.open` from Material. These are static results, not runtime rendering/navigation proof. Default-export routes and shared/recursive fragments need explicit source relationships in addition to class references.
- All eight peculiar items were investigated; runtime registry keys and conditional route choices remain unresolved. The next gate remains a supervised supplied-workspace trial rather than claiming a universal 95% score. No commit, publication or application migration is authorized or performed.
