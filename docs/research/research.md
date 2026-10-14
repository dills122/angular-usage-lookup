# Research and recommendation

## Decision

**Build the requested skill as an orchestrator of Angular's existing language tooling. Qualify an LSP connection before claiming exhaustive workspace results.** The initial skill is delivered in [skill/angular-usage-lookup](../../skill/angular-usage-lookup/SKILL.md). A custom parser/analyzer is not justified by the evidence collected so far.

The owner's question, budget and scope are in [brief](brief.md); source IDs resolve in [sources](sources.md). The initial research prioritized official documentation/source and bridge-maintainer docs. The subsequent authorized fixture execution is recorded in [pilot results](pilot-results.md) [S18]; no production workspace was supplied.

## Evidence and implications

| Finding | Evidence type | Implication and limit |
| --- | --- | --- |
| Angular 21 is the newest major in LTS on 2026-10-13; 22 is active. | Documented fact [S1] | Target the installed 21.x patch for first qualification; do not silently use newest global packages. |
| Angular Language Service understands inline/external templates. Its LSP server exposes references. | Documented/source fact [S2, S3] | Existing semantic engine and transport are available; the skill need not implement selector resolution. |
| Upstream tests assert references from component classes to template instances, imports and module registrations. Other tests exercise directives and aliased/two-way bindings. | Source fact [S4] | Stronger evidence than a tool's general marketing claim. Tests were inspected on main, not executed on Angular 21. |
| References are obtained through generated template type-check blocks and mapped into source. | Source fact [S4] | Preserve source maps and returned spans. A provider range is evidence, not automatically the substring a migration should replace. |
| Selectors can involve attributes/classes, combinations, alternatives and negation. | Documented fact [S5] | Grepping a guessed tag cannot establish identity or completeness. |
| Components can be rendered programmatically and directives composed via hostDirectives. | Documented fact [S6, S7] | Template instances, TS dependencies and indirect impacts require separate inventory categories. |
| Nx supplies project discovery, but its project graph is not evidence of a particular Angular template binding. | Fact plus inference [S8, S9] | Use Nx for the scope ledger; use Angular for binding identity. Current Nx MCP minimal mode makes CLI discovery a practical default. |
| Neither inspected Angular MCP catalog lists generic semantic find-references. | Bounded documentation observation [S10] | Helpful for workspace/docs tasks, but not the core lookup backend. This does not prove no such tool exists anywhere. |
| Compiler internals expose template/symbol/directive queries. | Source fact [S11] | A thin adapter remains a fallback if existing LSP transport fails; it brings version/fixture maintenance and is not built now. |
| Generic LSP-to-MCP bridges exist, but Angular compatibility is not established by their inspected docs. | Documentation observation [S13, S14] | Pilot one if the agent lacks an existing Angular connection; do not assume a TypeScript bridge config covers HTML. |
| A recent issue reports lost external-template associations in solution-style Nx workspaces. | Reported defect [S15] | Test cold starts and project switching; empty responses require coverage evidence. Applicability to installed 21.x remains unknown. |

## Alternatives

| Option | Fit | Work owned by us | Decision |
| --- | --- | --- | --- |
| Official Angular editor integration + skill | Strong existing semantic path, quick baseline | Scope, reconciliation and report instructions | Preferred baseline where accessible |
| Official Angular server + existing LSP/MCP bridge + skill | Agent automation without custom semantic engine | Versioned configuration and Angular-specific qualification | Recommended next pilot if direct LSP unavailable |
| Nx CLI/MCP or Angular CLI MCP alone | Project discovery/docs | Cannot infer missing semantic capability | Supporting tools |
| TypeScript/ts-morph + text or AST search | Useful with existing tools and no new service | Manual scope/selector validation; more unresolved cases | Honest partial fallback |
| Compiler-backed custom CLI/MCP | Potentially deterministic per-config inventories | Program loading, compiler internals, source mapping, compatibility and packaging | Defer unless the LSP pilot demonstrates a concrete gap |
| Manual IDE lookup only / do nothing | Reasonable for a one-off small migration | Repeated human reconciliation or no inventory | Baseline; weaker repeatability for monorepos |

No pricing, production performance, recall percentage or maintenance-savings estimate is asserted. The initial procedural skill was dependency-free; the implemented isolated helper package now locks official Angular tooling and Microsoft protocol libraries, with Nx/compiler fixture dependencies. See the pilot for exact versions and dependency review.

## Proposed division of responsibility

- **Angular:** template parsing, scope-aware semantics and template/code reference evidence.
- **TypeScript:** code symbols, aliases, imports and typed references when separately needed.
- **Nx/Angular workspace configuration:** enumerate the configurations that must be checked.
- **Skill:** disambiguate target, qualify tools, reconcile candidate search, classify usages and report coverage/migration implications.

This division is a design recommendation. A skill cannot create a missing callable backend by instructions alone. A plain TypeScript graph or semantic-looking MCP result must not be relabeled Angular semantic proof.

## Risks and uncertainty

The highest risk is false completeness: uninitialized projects, different consumer `.d.ts` identities, solution-style configs, omitted tests/stories, and external-template association can hide references. The mitigation is an explicit per-config ledger and known-use probes; the validation fixture must determine whether a particular bridge can satisfy it.

Runtime registries, computed imports, remote federation consumers and arbitrary dynamic strings cannot be promised exhaustive static resolution. A confirmed class registration is useful evidence even when rendering sites remain candidates. All-static-usages and all-runtime-usages are different questions; the report states which one it can answer.

The initial version-pinned source fetch failed, but published Angular 21.2.25 packages were subsequently installed and tested. The [pilot](pilot-results.md) establishes exact reference sets for one Angular project and two Nx consumers, with lifecycle and failure checks. No production repository, large-monorepo performance run or broad supported-version matrix is qualified. Research status remains `validating` for those wider claims. [S18]

## Current decision

Retain the skill plus three local helpers using official Angular language-server/service and Microsoft's protocol libraries. The owner authorized this implementation, and the narrow component path now passes. A generic MCP bridge remains optional; neither it nor a compiler-internals adapter was needed. The earlier bridge-first alternative was a research candidate, superseded for this pilot by actual direct-LSP execution. [S0, S18]

Use the [current plan](plan.md) and [validation gates](validation.md) for the next supplied-workspace trial. The helper deliberately requires explicit configs and known template probes; the skill reconciles scope and candidates. No connector was installed, no migration was performed, and no broad completeness claim follows from fixture success.

## Expanded execution evidence

The owner subsequently requested a harder six-library/legacy-scope/Material test. [Expanded results](stress-results.md) show the Angular reference path working unchanged for 26 expected card spans across eight configs. A real limitation in dialog-only qualification justified one additional public TypeScript service adapter. Verified alias queries recover the lazy-binding use; indirect wrappers/registries still require skill-directed source/reference investigation. Fourteen tests pass, with runtime-selected registry entries kept as candidates. [S19, S20]

## Material catalog follow-up — 2026-10-13

The owner requested generated package mappings and family configs after the stress fixture passed. The [bounded experiment](material-catalog-results.md) reuses TypeScript export/type resolution and Angular's existing declaration metadata/selector readers. It generates 37 entrypoint-based groups and 712 public export mappings from the installed Material package, while preserving supporting declarations and explicit exclusions. Three reviewed programmatic opener rules sit beside extracted facts. [S21, S23]

Material's Dgeni/Bazel documentation pipeline is an existing alternative, but using it would require source/build setup; it was not executed here. The installed declaration approach adds no dependency. Its important tradeoff is Angular's private migration metadata API, so exact versions are checked and updates require requalification. Catalog generation supplies query context and does not widen the collector's application-coverage claims. [S21–S23]
